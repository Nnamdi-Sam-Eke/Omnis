import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Mail,
  Edit3,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Phone,
  Globe,
  X,
} from "lucide-react";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    company: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [formStatus, setFormStatus] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const messageRef = useRef();

  useEffect(() => setIsVisible(true), []);

  useEffect(() => {
    const ta = messageRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, [formData.message]);

  const validators = {
    name: (v) => (v.trim().length >= 2 ? "" : "Name must be at least 2 characters"),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Please enter a valid email address",
    subject: (v) => (v.trim().length >= 3 ? "" : "Subject must be at least 3 characters"),
    message: (v) => (v.trim().length >= 10 ? "" : "Message must be at least 10 characters"),
    phone: (v) => !v || /^[\+]?[0-9\s\-\(\)]+$/.test(v) ? "" : "Please enter a valid phone number",
  };

  const validateField = (name, value) => {
    const error = validators[name]?.(value) || "";
    setErrors((e) => ({ ...e, [name]: error }));
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((d) => ({ ...d, [name]: value }));
    if (errors[name]) validateField(name, value);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setFocusedField(null);
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(formData).forEach((k) => {
      if (k === "company" || k === "phone") return;
      const err = validators[k]?.(formData[k]);
      if (err) newErrors[k] = err;
    });
    if (formData.phone) {
      const phoneError = validators.phone(formData.phone);
      if (phoneError) newErrors.phone = phoneError;
    }

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      document.querySelector(`[name="${Object.keys(newErrors)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFormStatus("loading");
    const formDataEncoded = new FormData();
    Object.entries(formData).forEach(([key, value]) => formDataEncoded.append(key, value));

    try {
      const response = await fetch("https://formspree.io/f/xkgqydnd", {
        method: "POST",
        body: formDataEncoded,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setFormStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "", company: "", phone: "" });
        setErrors({});
      } else {
        throw new Error("Form submission failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setFormStatus("error");
    }
  };

  const getFieldClasses = (fieldName) => {
    const base = "w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white";
    if (errors[fieldName]) return `${base} border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30`;
    if (focusedField === fieldName) return `${base} border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30`;
    return `${base} border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none`;
  };

  const dismissStatus = () => setFormStatus(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className={`container mx-auto px-4 py-12 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Let's Connect
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Ready to bring your ideas to life? We'd love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8">
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Send us a message</h2>
                  <p className="text-gray-600 dark:text-gray-400">We'll get back to you within 24 hours</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Name & Email */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${focusedField === "name" ? "text-blue-500" : "text-gray-400"}`} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("name")}
                      onBlur={handleBlur}
                      placeholder="Your name *"
                      aria-label="Your name"
                      aria-required="true"
                      className={getFieldClasses("name")}
                    />
                    {errors.name && (
                      <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> {errors.name}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${focusedField === "email" ? "text-blue-500" : "text-gray-400"}`} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("email")}
                      onBlur={handleBlur}
                      placeholder="your.email@example.com *"
                      aria-label="Email address"
                      aria-required="true"
                      className={getFieldClasses("email")}
                    />
                    {errors.email && (
                      <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> {errors.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Company & Phone */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative">
                    <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${focusedField === "company" ? "text-blue-500" : "text-gray-400"}`} />
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("company")}
                      onBlur={handleBlur}
                      placeholder="Company name (optional)"
                      aria-label="Company name"
                      className={getFieldClasses("company")}
                    />
                  </div>

                  <div className="relative">
                    <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${focusedField === "phone" ? "text-blue-500" : "text-gray-400"}`} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={handleBlur}
                      placeholder="Phone number (optional)"
                      aria-label="Phone number"
                      className={getFieldClasses("phone")}
                    />
                    {errors.phone && (
                      <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> {errors.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div className="relative">
                  <Edit3 className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${focusedField === "subject" ? "text-blue-500" : "text-gray-400"}`} />
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("subject")}
                    onBlur={handleBlur}
                    placeholder="What's this about? *"
                    aria-label="Subject"
                    aria-required="true"
                    className={getFieldClasses("subject")}
                  />
                  {errors.subject && (
                    <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> {errors.subject}
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="relative">
                  <MessageSquare className={`absolute left-4 top-4 w-5 h-5 ${focusedField === "message" ? "text-blue-500" : "text-gray-400"}`} />
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("message")}
                    onBlur={handleBlur}
                    ref={messageRef}
                    placeholder="Tell us more about your project or question... *"
                    rows={4}
                    aria-label="Message"
                    aria-required="true"
                    className={`${getFieldClasses("message")} resize-none`}
                  />
                  {errors.message && (
                    <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> {errors.message}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={formStatus === "loading"}
                  className={`w-full rounded-xl px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] focus:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                    formStatus === "loading" ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    {formStatus === "loading" ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" /> Send Message
                      </>
                    )}
                  </div>
                </button>
              </div>

              {/* Status Messages */}
              {formStatus === "success" && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 dark:text-green-300">Message sent successfully!</p>
                      <p className="text-sm text-green-600 dark:text-green-400">We'll get back to you within 24 hours.</p>
                    </div>
                    <button onClick={dismissStatus} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200" aria-label="Dismiss success message">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {formStatus === "error" && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 dark:text-red-300">Something went wrong</p>
                      <p className="text-sm text-red-600 dark:text-red-400">Please try again or contact us directly.</p>
                    </div>
                    <button onClick={dismissStatus} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200" aria-label="Dismiss error message">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Phone</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">+1 (555) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">hello@omnis.ai</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Website</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">www.omnis.ai</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;