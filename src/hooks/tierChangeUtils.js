/**
 * useTierChangeDetector.js
 * 
 * THE ONLY FILE YOU NEED!
 * 
 * Automatically detects when a user's tier changes and creates
 * persistent notifications in Firestore.
 * 
 * No Cloud Functions needed.
 * No tierChangeUtils.js needed.
 * No user document fields needed.
 * 
 * Just import this hook in App.js and you're done!
 * 
 * Usage:
 *   import { useTierChangeDetector } from './hooks/useTierChangeDetector';
 *   
 *   function App() {
 *     const { user } = useAuth();
 *     useTierChangeDetector(user);
 *     return <Router>...</Router>;
 *   }
 */

import { useEffect, useRef } from 'react';
import {
  doc,
  onSnapshot,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Detects tier changes and creates persistent notifications
 * 
 * How it works:
 * 1. Listens to user document in real-time
 * 2. Compares current tier with localStorage (previous tier)
 * 3. If different, creates notification in Firestore
 * 4. Notification persists forever in Firestore
 * 5. ActivityLog, NotificationsPage, and Dropdown all read from Firestore
 * 
 * @param {Object} user - User object from useAuth() with uid property
 */
export function useTierChangeDetector(user) {
  const unsubscribeRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // No user - cleanup and exit
    if (!user?.uid) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    /**
     * Handles tier changes by creating notifications in Firestore
     */
    const handleTierChange = async (currentTier) => {
      // Prevent concurrent processing
      if (isProcessingRef.current || !currentTier) return;
      
      isProcessingRef.current = true;
      
      try {
        // Get stored tier from localStorage
        const storageKey = `lastKnownTier_${user.uid}`;
        const storedTier = localStorage.getItem(storageKey);
        
        // Normalize tier names for consistent comparison
        const normalizedStored = normalizeTier(storedTier);
        const normalizedCurrent = normalizeTier(currentTier);
        
        // First time seeing this user - just store the tier
        if (!storedTier) {
          localStorage.setItem(storageKey, normalizedCurrent);
          console.log(`✅ Initial tier stored for user ${user.uid}: ${normalizedCurrent}`);
          return;
        }
        
        // Tier changed - create notification!
        if (normalizedStored !== normalizedCurrent) {
          console.log(`🔔 Tier change detected for user ${user.uid}:`);
          console.log(`   From: ${normalizedStored}`);
          console.log(`   To: ${normalizedCurrent}`);
          
          // Determine if this is an upgrade or downgrade
          const tierLevels = {
            "Free": 0,
            "Pro": 1,
            "Enterprise": 2
          };
          
          const fromLevel = tierLevels[normalizedStored] || 0;
          const toLevel = tierLevels[normalizedCurrent] || 0;
          const isUpgrade = toLevel > fromLevel;
          
          // Create notification document in Firestore
          // This makes the notification PERSIST - it's stored in Firestore forever!
          const notificationData = {
            userId: user.uid,
            title: isUpgrade ? "Plan Upgraded" : "Plan Downgraded",
            message: `You ${isUpgrade ? 'upgraded' : 'downgraded'} your plan from ${normalizedStored} to ${normalizedCurrent}`,
            type: isUpgrade ? "success" : "alert",
            timestamp: serverTimestamp(),
            read: false,
            source: "system",
            isTierChange: true,
            tierChangeDetails: {
              from: normalizedStored,
              to: normalizedCurrent,
              isUpgrade: isUpgrade
            }
          };
          // Add to Firestore notifications collection
          const docRef = await addDoc(collection(db, "notifications"), notificationData);

          // Also update the user document with planUpgraded/planDowngraded and tier
          const userRef = doc(db, 'users', user.uid);
          const planField = isUpgrade ? { planUpgraded: { from: normalizedStored, to: normalizedCurrent, timestamp: serverTimestamp() } } : { planDowngraded: { from: normalizedStored, to: normalizedCurrent, timestamp: serverTimestamp() } };
          try {
            await updateDoc(userRef, {
              ...planField,
              tier: normalizedCurrent
            });
          } catch (err) {
            console.error('Failed to update user doc with plan change:', err);
          }

          console.log(`✅ Notification created in Firestore (ID: ${docRef.id})`);
          console.log(`   This notification will persist and show in:`);
          console.log(`   - NotificationsPage ✓`);
          console.log(`   - ActivityLog ✓`);
          console.log(`   - NotificationsDropdown ✓`);

          // Update localStorage with new tier
          localStorage.setItem(storageKey, normalizedCurrent);
        }
      } catch (error) {
        console.error('❌ Error handling tier change:', error);
        // Don't update localStorage if notification creation failed
        // This way, we'll retry on next check
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Set up real-time listener on user document
    // This fires automatically whenever the tier field changes
    const userRef = doc(db, 'users', user.uid);
    
    console.log(`👂 Listening for tier changes for user ${user.uid}...`);
    
    unsubscribeRef.current = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          handleTierChange(userData.tier);
        }
      },
      (error) => {
        console.error('❌ Error listening to user document:', error);
      }
    );

    // Cleanup function - runs when component unmounts or user changes
    return () => {
      if (unsubscribeRef.current) {
        console.log(`👋 Stopped listening for tier changes for user ${user.uid}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid]);
}

/**
 * Helper function to normalize tier names
 * Handles variations like "pro", "Pro", "PRO", etc.
 */
function normalizeTier(tier) {
  if (!tier) return "Free";
  
  const t = String(tier).toLowerCase().trim();
  
  if (t.includes('enterpris')) return "Enterprise";
  if (t.includes('pro')) return "Pro";
  
  return "Free";
}

export default useTierChangeDetector;