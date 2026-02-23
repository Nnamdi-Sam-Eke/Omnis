import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, CheckCircle, Sparkles, Zap, Target, TrendingUp, Users } from "lucide-react";

function Home() {
  const [currentStep, setCurrentStep] = useState(0);

  // Use Case Data
  const useCases = [
    { 
      title: "Solo Founders & Builders", 
      desc: "Navigate product decisions, resource allocation, and strategic direction with structured clarity.",
      icon: <Target aria-hidden="true" className="w-6 h-6" />,
      color: "from-purple-500 to-violet-500"
    },
    { 
      title: "Business Professionals", 
      desc: "Make high-impact decisions with confidence by understanding trade-offs and long-term implications.",
      icon: <TrendingUp aria-hidden="true" className="w-6 h-6" />,
      color: "from-violet-500 to-indigo-500"
    },
    { 
      title: "Strategic Planners", 
      desc: "Evaluate complex scenarios and competing priorities with transparent, interpretable insights.",
      icon: <Zap aria-hidden="true" className="w-6 h-6" />,
      color: "from-indigo-500 to-purple-500"
    },
    { 
      title: "Thoughtful Decision-Makers", 
      desc: "Anyone seeking clarity without noise, valuing structured thinking and intentional action.",
      icon: <Users aria-hidden="true" className="w-6 h-6" />,
      color: "from-purple-600 to-violet-600"
    },
  ];

  const steps = [
    { 
      title: "Define Your Situation", 
      desc: "Input your scenario, variables, constraints, and options using natural language.",
      icon: "01"
    },
    { 
      title: "Structure & Analyze", 
      desc: "Our AI organizes the problem, runs simulations, and highlights trade-offs for clear insights.",
      icon: "02"
    },
    { 
      title: "Gain Clarity", 
      desc: "Receive interpretable insights with transparent reasoning, enabling confident decisions.",
      icon: "03"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(s => (s + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Scroll-triggered reveal for sections (prefers-reduced-motion respected)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (reduce) {
      els.forEach(el => el.classList.add('in-view'));
      return;
    }

    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Hero Section
  const HeroSection = () => (
    <div className="relative min-h-screen bg-black flex items-start pt-8 md:pt-16 overflow-hidden">
      {/* Subtle animated blobs - very dark */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-lighten filter blur-3xl animate-blob will-change-transform"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500 rounded-full mix-blend-lighten filter blur-3xl animate-blob animation-delay-2000 will-change-transform"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-500 rounded-full mix-blend-lighten filter blur-3xl animate-blob animation-delay-4000 will-change-transform"></div>
      </div>
      
      <div className="relative z-10 max-w-5xl mx-auto md:ml-12 px-4 md:px-6 py-2 md:py-8">
        <div className="max-w-xl md:max-w-2xl">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-400/30 rounded-full text-purple-300 text-sm mb-8 backdrop-blur-sm">
            <Sparkles aria-hidden="true" className="w-4 h-4 mr-2" />
            Now in Beta
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 md:mb-6 leading-tight tracking-tight">
            Omnis
          </h1>
          
          <p className="text-xl sm:text-2xl md:text-3xl font-medium text-gray-300 mb-6 md:mb-8 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 animate-pulse-slow">
              Clarity for complex decisions.
            </span>
          </p>
          
          <p className="text-sm md:text-base text-gray-400 mb-8 md:mb-12 leading-relaxed max-w-2xl font-normal">
            A decision-support platform that helps you evaluate choices before acting. Organize variables, constraints, and options to get clear, interpretable insights — so you can decide with confidence, not guesswork.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <a 
              href="https://forms.gle/ghzjN5MMdnAApqZ46" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Join Beta" 
              className="group bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-semibold text-base md:text-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 tracking-tight animate-pulse-slow inline-block text-center"
            >
              Join Beta
              <ArrowRight aria-hidden="true" className="inline ml-2 w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1" />
            </a>
            
            {/* <button aria-label="Join Discord" className="bg-black/80 backdrop-blur hover:bg-zinc-900 border border-zinc-800 hover:border-purple-600/50 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 tracking-tight">
              Join Discord
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );

  // About Section with visual interest
  const AboutSection = () => (
    <section className="reveal py-16 bg-black relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-3">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #8b5cf6 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Why Omnis Exists</h2>
              <p className="text-sm text-gray-300 leading-relaxed font-normal">
                Important decisions are rarely simple. They involve uncertainty, trade-offs, and long-term consequences. Most tools either oversimplify these realities or overwhelm you with information. Omnis is built to do neither.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">How It Helps</h2>
              <p className="text-sm text-gray-300 leading-relaxed font-normal">
                You define your situation and options. Omnis structures the problem, analyzes the factors involved, and highlights key trade-offs — presenting insights in a clear, interpretable way. The goal isn't automation. It's better judgment.
              </p>
            </div>
          </div>

          <div className="lg:sticky lg:top-8">
            <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 backdrop-blur-xl rounded-3xl border border-purple-400/20 p-6 relative overflow-hidden">
              {/* Animated elements */}
              <div className="absolute top-4 right-4 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              <div className="absolute bottom-8 left-8 w-2 h-2 bg-violet-400 rounded-full animate-pulse animation-delay-1000"></div>
              <div className="absolute top-1/2 right-8 w-2 h-2 bg-indigo-400 rounded-full animate-pulse animation-delay-2000"></div>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <Zap aria-hidden="true" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2 tracking-tight">Structured Reasoning</h3>
                    <p className="text-xs text-gray-400 font-normal">Built on frameworks that reflect how decisions actually work.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Target aria-hidden="true" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2 tracking-tight">Transparent Insights</h3>
                    <p className="text-xs text-gray-400 font-normal">Every recommendation shows why it makes sense.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle aria-hidden="true" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2 tracking-tight">Calm by Design</h3>
                    <p className="text-xs text-gray-400 font-normal">Clarity, not noise. Insight over information overload.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // Steps Section with interaction
  const StepsSection = () => {
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);

    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
      if (!touchStartX.current) return;
      touchEndX.current = e.changedTouches[0].clientX;
      const dx = touchEndX.current - touchStartX.current;
      const threshold = 50;
      if (dx > threshold) {
        setCurrentStep(s => (s - 1 + steps.length) % steps.length);
      } else if (dx < -threshold) {
        setCurrentStep(s => (s + 1) % steps.length);
      }
      touchStartX.current = null;
    };

    return (
      <section className="reveal py-16 bg-black relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">How It Works</h2>
            <p className="text-base text-gray-400 font-normal">Three steps to better judgment</p>
          </div>
          
          <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {/* Progress line */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-zinc-900">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-1000 ease-out"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8 relative">
              {steps.map((step, i) => (
                <div key={i} className={`relative cursor-pointer`} onClick={() => setCurrentStep(i)}>
                  <div className={`bg-zinc-950/80 backdrop-blur border ${i === currentStep ? 'border-purple-500/50' : 'border-zinc-800'} rounded-2xl p-4 hover:border-purple-500/50 transition-all duration-300`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold mb-6 transition-all duration-500 ${i === currentStep ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white transform translate-y-0 opacity-100' : 'bg-zinc-900 text-zinc-500 transform -translate-y-2 opacity-60'}`} style={{willChange: 'transform'}}>
                      {step.icon}
                    </div>
                    <h3 className={`text-lg font-bold mb-3 text-white tracking-tight transition-opacity duration-500 ${i===currentStep ? 'opacity-100' : 'opacity-60'}`}>{step.title}</h3>
                    <p className={`text-xs text-gray-400 leading-relaxed font-normal transition-all duration-500 ${i===currentStep ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Step indicators */}
            <div className="flex justify-center mt-12 space-x-2">
              {steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  aria-label={`Go to ${step.title}`}
                  className={`step-indicator h-1.5 rounded-full ${i === currentStep ? 'bg-purple-500' : 'bg-zinc-800'}`}
                  style={{ width: i === currentStep ? 32 : 6 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  // Use Cases with hover effects
  const UseCasesSection = () => (
    <section className="reveal py-16 bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-white tracking-tight">Built for Thoughtful Decision-Makers</h2>
          <p className="text-base text-gray-400 font-normal">If you value structured thinking and intentional action</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {useCases.map((useCase, i) => (
            <div
              key={i}
              className="group relative bg-zinc-950/50 backdrop-blur border border-zinc-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${useCase.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 usecase-icon will-change-transform`}>
                {useCase.icon}
              </div>
              <h3 className="text-lg font-bold mb-3 text-white tracking-tight">{useCase.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-normal">{useCase.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // CTA Section
  const CallToActionSection = () => (
    <section className="py-16 bg-black relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-lighten filter blur-3xl animate-blob will-change-transform"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500 rounded-full mix-blend-lighten filter blur-3xl animate-blob animation-delay-2000 will-change-transform"></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white tracking-tight">
          Better Decisions
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400">
            Start with Clarity
          </span>
        </h2>
        <p className="text-base text-gray-400 mb-12 max-w-2xl mx-auto font-normal">
          Be among the first to experience decision-making with clarity, not guesswork. Join our beta community today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a 
            href="https://forms.gle/ghzjN5MMdnAApqZ46" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Sign up for Beta" 
            className="group bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25 tracking-tight animate-pulse-slow inline-block text-center"
          >
            Sign Up for Beta
            <ArrowRight aria-hidden="true" className="inline ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
          </a>
          
          <a 
            href="https://chat.whatsapp.com/CxqqplmS8ZZA4x74QJJMPb" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Join community" 
            className="bg-zinc-950/80 backdrop-blur hover:bg-zinc-900 border border-zinc-800 hover:border-purple-600/50 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 tracking-tight inline-block text-center"
          >
            Join Community
          </a>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
          <span className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-purple-400" />
            Free during beta
          </span>
          <span className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-purple-400" />
            No credit card required
          </span>
        </div>
      </div>
    </section>
  );

  return (
    <div className="relative bg-black text-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        h1, h2, h3 {
          letter-spacing: -0.02em;
        }
        
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulseSlow 3.5s ease-in-out infinite;
        }

        .will-change-transform {
          will-change: transform;
        }

        .step-indicator {
          transition: width 360ms cubic-bezier(0.22,1,0.36,1), background-color 280ms ease;
        }

        .usecase-icon {
          transition: transform 350ms ease, box-shadow 350ms ease;
        }
        .usecase-icon:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 10px 30px rgba(124,58,237,0.12), 0 4px 12px rgba(99,102,241,0.06);
        }

        @media (max-width: 640px) {
          .animate-blob { animation-duration: 12s; transform: scale(0.85); }
          .bg-gradient-to-br.backdrop-blur-xl { padding: 1.5rem; }
          .animate-pulse { animation-duration: 1.6s; }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-blob, .animate-pulse, .animate-pulse-slow { animation: none !important; }
          .step-indicator { transition: none !important; }
        }
      `}</style>
      
      <HeroSection />
      <AboutSection />
      <StepsSection />
      <UseCasesSection />
      <CallToActionSection />
    </div>
  );
}

export default Home;