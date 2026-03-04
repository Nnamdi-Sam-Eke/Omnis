import { createContext, useState, useContext, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, writeBatch } from 'firebase/firestore';

// Create Context
const OmnisContext = createContext();

// Context Provider Component
export const OmnisProvider = ({ children }) => {
    const [contextData, setContextData] = useState({
        location: null,         // Stores user location (city, country)
        pastQueries: [],        // Stores previous user interactions
        preferences: {},        // User-specific settings
        sentiment: null,        // Stores detected user emotion
        lastIntent: null,       // Stores last detected intent
        chatHistory: []         // Stores past queries & responses
    });
    const [localCache, setLocalCache] = useState([]);   // 🔄 Cache for batching writes
    const [userId, setUserI] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId("guest_user");  // Default for unauthenticated users
            }
        });
    }, []);

    const userDocRef = userId ? doc(db, "users", userId) : null;

    // Function to update context dynamically & save to Firestore
    const updateContext = async (newData) => {
        const updatedData = { ...contextData, ...newData };
        setContextData(updatedData);
        setLocalCache((prevCache) => [...prevCache, updatedData]);

        // 🔄 Write to Firestore in batches of 3
        if (localCache.length >= 3 && userDocRef) {
            try {
                const batch = writeBatch(db);
                localCache.forEach((cachedData) => batch.set(userDocRef, cachedData));
                await batch.commit();
                console.log("✅ Batch written to Firestore:", localCache);
                setLocalCache([]);  // 🔄 Clear cache after writing
            } catch (error) {
                console.error("❌ Error writing batch to Firestore:", error);
            }
        }
    };

    // Function to store chat history with user feedback
    const addChatHistory = async (userMessage, aiResponse) => {
        const chatEntry = { userMessage, aiResponse, feedback: null, timestamp: Date.now() };
        setContextData(prevState => ({
            ...prevState,
            chatHistory: [...prevState.chatHistory, chatEntry]
        }));
        await updateContext({ chatHistory: arrayUnion(chatEntry) });
    };

    // Function to store feedback for a specific response
    const addFeedback = async (timestamp, feedback) => {
        if (!userDocRef) return;

        try {
            const chatHistoryRef = doc(db, "users", userId);
            const docSnap = await getDoc(chatHistoryRef);

            if (docSnap.exists()) {
                const chatHistory = docSnap.data().chatHistory;
                const updatedHistory = chatHistory.map(entry =>
                    entry.timestamp === timestamp ? { ...entry, feedback } : entry
                );
                await updateDoc(chatHistoryRef, { chatHistory: updatedHistory });
                console.log("✅ Feedback saved for response:", feedback);
            }
        } catch (error) {
            console.error("❌ Error saving feedback:", error);
        }
    };

    // Load full chat history from Firestore when component mounts
    useEffect(() => {
        if (!userDocRef) return;
        const fetchUserContext = async () => {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                setContextData(docSnap.data());
            }
        };
        fetchUserContext();

        // Fetch user's location using Geolocation API
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    const data = await response.json();
                    updateContext({ location: { city: data.city, country: data.countryName } });
                } catch (error) {
                    console.error("Error fetching location data:", error);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
            }
        );
    }, [userId]);

    // Function to send properly formatted context-aware query to Gemini API
    const sendContextAwareQuery = async (userInput) => {
        const { location, pastQueries, preferences, sentiment, chatHistory } = contextData;
        const formattedHistory = chatHistory.map(entry => `User: ${entry.userMessage}\nOmnis: ${entry.aiResponse}`).join("\n");
        const prompt = `You are Omnis, an AI assistant. Here is the conversation history:\n\n` +
                       `${formattedHistory}\n\n` +
                       `Current user input: ${userInput}\n\n` +
                       `User details:\n` +
                       `- Location: ${location?.city || 'Unknown'}\n` +
                       `- Preferences: ${JSON.stringify(preferences) || 'None'}\n` +
                       `- Sentiment: ${sentiment || 'Neutral'}\n` +
                       `Use this information to give a well-informed and contextual response.`;

        try {
            const response = await fetch('https://api.gemini.com/v1/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer YOUR_GEMINI_API_KEY`
                },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();
            await addChatHistory(userInput, data.response);
            return data;
        } catch (error) {
            console.error('Error fetching AI response:', error);
            return null;
        }
    };

    return (
        <OmnisContext.Provider value={{ contextData, updateContext, addFeedback, sendContextAwareQuery }}>
            {children}
        </OmnisContext.Provider>
    );
};

// Custom Hook to use Omnis Context
export const useOmnisContext = () => useContext(OmnisContext);
    
    // In the code above, we define the  OmnisContext  and  OmnisProvider  components to manage the global state of our application. We use the  createContext  function to create a new context, and the  useState  hook to manage the state of our context. 
    // The  OmnisProvider  component wraps the entire application and provides the context to all child components. It also contains functions to update the context, store chat history, and send context-aware queries to the Gemini API. 
    // The  useOmnisContext  hook allows us to access the context data and functions from any component in the application. 
    // Step 5: Create the Chat Component 
    // Now that we have set up the context and provider components, we can create the chat interface for our Omnis AI assistant. 
    // Create a new file named  Chat.js  in the  src  directory and add the following code: