import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import { LucideIcon } from './components/LucideIcon';
import { Button } from './components/Button';


      // --- APPLICATION CONSTANTS ---
      const APP_CONSTANTS = {
        // Timeouts
        SAVE_TIMEOUT_MS: 8000,           // Max time to wait for save before showing warning
        AI_PARSE_TIMEOUT_MS: 30000,      // Max time to wait for AI parsing
        QUICK_SAVE_TIMEOUT_MS: 1500,     // Time to wait before showing "syncing" status
        SIDE_EFFECT_TIMEOUT_MS: 20000,   // Timeout for background operations

        // Limits
        ENTRIES_LIMIT_DEFAULT: 500,       // Default number of entries to load
        MAX_GOALS: 6,                    // Maximum number of goals per profile
        MAX_IMPORT_FILE_SIZE_MB: 10,     // Maximum JSON import file size
        MAX_IMPORT_ENTRIES: 10000,       // Maximum entries in a single import
        MAX_IMPORT_PROFILES: 5000,       // Maximum profiles in a single import

        // Validation
        TIME_REGEX: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
      };

      // --- SANITIZATION HELPERS ---
      const sanitizeHtml = (html) => {
        if (typeof DOMPurify !== "undefined") {
          return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ["div", "span", "p", "br", "b", "i", "strong", "em", "h1", "h2", "h3", "h4", "h5", "h6",
                          "ul", "ol", "li", "table", "tr", "td", "th", "thead", "tbody", "header", "footer",
                          "article", "section", "img", "svg", "path", "rect", "text", "defs", "linearGradient", "stop"],
            ALLOWED_ATTR: ["class", "style", "src", "alt", "href", "viewBox", "xmlns", "role", "aria-label",
                          "x", "y", "x1", "x2", "y1", "y2", "width", "height", "rx", "fill", "d", "font-family",
                          "font-size", "font-weight", "offset", "stop-color", "id"],
          });
        }
        // Fallback: basic escape if DOMPurify not loaded
        return String(html || "")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      };

      // --- TIME FORMAT HELPER ---
      const formatTime12h = (t) => {
        if (!t) return "";
        const [h, m] = t.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) return t;
        const period = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, "0")} ${period}`;
      };

      // --- AGE RANGE MIGRATION HELPER ---
      const migrateAgeRange = (val) => {
        const v = String(val || "").trim();
        if (v === "6-10") return "6-12";
        if (v === "11-14") return "";
        if (v === "15-19") return "13-19";
        return v;
      };

      // --- VALIDATION HELPERS ---
      const isValidTime = (time) => {
        if (!time) return true; // Empty is valid (not required)
        return APP_CONSTANTS.TIME_REGEX.test(time);
      };

      const isValidDate = (date) => {
        if (!date) return true; // Empty is valid (not required)
        if (!APP_CONSTANTS.DATE_REGEX.test(date)) return false;
        const d = new Date(date);
        return !isNaN(d.getTime());
      };

      const validateImportData = (data, fileSize) => {
        const errors = [];

        // Check file size
        const maxBytes = APP_CONSTANTS.MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024;
        if (fileSize > maxBytes) {
          errors.push(`File too large (max ${APP_CONSTANTS.MAX_IMPORT_FILE_SIZE_MB}MB)`);
        }

        // Check data structure
        if (!data || typeof data !== "object") {
          errors.push("Invalid JSON structure");
          return errors;
        }

        // Check entries
        if (data.entries !== undefined) {
          if (!Array.isArray(data.entries)) {
            errors.push("'entries' must be an array");
          } else if (data.entries.length > APP_CONSTANTS.MAX_IMPORT_ENTRIES) {
            errors.push(`Too many entries (max ${APP_CONSTANTS.MAX_IMPORT_ENTRIES})`);
          } else {
            // Validate entry structure
            const invalidEntries = data.entries.filter((e, i) => {
              if (!e || typeof e !== "object") return true;
              if (e.id && typeof e.id !== "string") return true;
              return false;
            });
            if (invalidEntries.length > 0) {
              errors.push(`${invalidEntries.length} entries have invalid structure`);
            }
          }
        }

        // Check profiles
        if (data.profiles !== undefined) {
          if (!Array.isArray(data.profiles)) {
            errors.push("'profiles' must be an array");
          } else if (data.profiles.length > APP_CONSTANTS.MAX_IMPORT_PROFILES) {
            errors.push(`Too many profiles (max ${APP_CONSTANTS.MAX_IMPORT_PROFILES})`);
          } else {
            // Validate profile structure
            const invalidProfiles = data.profiles.filter((p, i) => {
              if (!p || typeof p !== "object") return true;
              if (p.id && typeof p.id !== "string") return true;
              return false;
            });
            if (invalidProfiles.length > 0) {
              errors.push(`${invalidProfiles.length} profiles have invalid structure`);
            }
          }
        }

        // Must have at least one of entries or profiles
        if (!data.entries && !data.profiles) {
          errors.push("File must contain 'entries' or 'profiles'");
        }

        return errors;
      };

      // --- FIREBASE CONFIGURATION ---
      // Replace with your Firebase project config (Firebase Console > Project Settings).
      const firebaseConfig = {
        apiKey: "AIzaSyCwXdQN8RnoOo1lwHJ0lWy4Op9rERFaQDg",
        authDomain: "epworth-family-resources-docs.firebaseapp.com",
        projectId: "epworth-family-resources-docs",
        storageBucket: "epworth-family-resources-docs.firebasestorage.app",
        messagingSenderId: "498189568916",
        appId: "1:498189568916:web:f51272cbce734e9c029d81",
        measurementId: "G-2J0F3NGZHL",
      };

      const isFirebaseConfigured = (cfg) => {
        if (!cfg || typeof cfg !== "object") return false;
        const required = ["apiKey", "authDomain", "projectId", "appId"];
        if (!required.every((k) => Boolean(cfg[k]))) return false;
        const looksPlaceholder =
          String(cfg.apiKey).includes("YOUR_") ||
          String(cfg.projectId).includes("YOUR_") ||
          String(cfg.authDomain).includes("YOUR_") ||
          String(cfg.appId).includes("YOUR_");
        return !looksPlaceholder;
      };

      // Initialize Firebase (compat)
      let app = null;
      let auth = null;
      let db = null;
	      try {
	        if (isFirebaseConfigured(firebaseConfig)) {
	          // Check if Firebase is already initialized to prevent duplicate initialization
	          app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
	          auth = firebase.auth();
	          db = firebase.firestore();
	          // Enable offline persistence for faster repeat loads (best-effort).
	          try {
	            db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
	          } catch {
	            // ignore persistence errors (e.g., private mode, multiple tabs, unsupported browser)
	          }
	        }
	      } catch (error) {
	        console.error(
	          "Firebase Initialization Error. Make sure to replace firebaseConfig with your own keys.",
	          error
        );
      }

      // Authenticated fetch — automatically injects the current user's Firebase ID token
      async function authFetch(url, options = {}) {
        const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
        const headers = { ...(options.headers || {}) };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return fetch(url, { ...options, headers });
      }

      // App ID usually comes from the environment, defaulting here for local use
      const appId = "case-note-app-v1";

	      // --- Configuration & Requirements ---
	      const SERVICE_TYPES = ["OHFS/IHFS", "PTSV", "DST-U", "DST-MS", "DST-SP", "DST-HF"];
	      const DEFAULT_WORKER_NAMES = ["Brandon Hinrichs", "Martha Burgess", "Crystal Kuklish", "Amanda Schropfer", "Raquel Dean"];
	      const WORKER_CREDENTIALS = ["Family Life Specialist", "Director"];

	      const ALL_COLUMNS = [
	        { id: "worker_name", name: "Worker Name", type: "select", options: DEFAULT_WORKER_NAMES },
	        { id: "worker_credential", name: "Credentials", type: "select", options: WORKER_CREDENTIALS },
	        { id: "date", name: "Date of Service", type: "date" },
	        { id: "start_time", name: "Start Time", type: "time" },
	        { id: "end_time", name: "End Time", type: "time" },
	        { id: "service_type", name: "Service Type", type: "select", options: SERVICE_TYPES },
		        {
		          id: "contact_type",
		          name: "Type of Contact",
		          type: "select",
			          options: [
			            "Face-to-Face Visit",
			            "Virtual Visit",
			            "Phone Call",
			            "Text Message",
			            "Monitored Visit",
			            "Cancelled by Parent",
			            "Cancelled by Worker",
			            "Cancelled for Weather",
			            "Cancelled by Team",
			            "Cancelled No Confirmation",
			          ],
			        },
        { id: "master_case", name: "Master Case #", type: "text" },
        { id: "family_name", name: "Family Name", type: "text" },
        { id: "family_id", name: "Family ID", type: "text" },
        { id: "cfss", name: "CFSS", type: "text" },
        { id: "typical_location", name: "Typical Location", type: "text" },
        { id: "referral_goals", name: "Referral Goals (Raw)", type: "textarea" },
        { id: "location", name: "Location", type: "text" },
        { id: "participants", name: "Participants", type: "text" },
	        { id: "goals_progress", name: "Goals", type: "textarea" },
	        { id: "visit_narrative", name: "Session/Visit Narrative", type: "textarea" },
	        { id: "dropins_text", name: "Drop-ins", type: "textarea" },
	        // Safety Assessment - conditional fields
	        { id: "safety_concern_present", name: "Were there any safety concerns?", type: "select", options: ["No", "Yes"] },
	        { id: "safety_concern_description", name: "What was the safety concern?", type: "textarea" },
	        { id: "safety_concern_addressed", name: "How was it addressed?", type: "textarea" },
	        {
	          id: "safety_notification",
	          name: "Who was notified?",
	          type: "multiselect",
	          options: ["Supervisor Only", "All Parties", "HHS Hotline", "Further Notification Not Necessary"]
	        },
	        { id: "safety_hotline_intake", name: "HHS Hotline Intake Number (if applicable)", type: "text" },
	        // Legacy field for backward compatibility
	        { id: "safety_assessment", name: "Safety Assessment", type: "textarea" },
	        { id: "interventions", name: "Interventions/Activities", type: "textarea" },
        { id: "interactions", name: "Interactions & Bonding", type: "textarea" },
        { id: "parenting_skills", name: "Parenting Skills Observed", type: "textarea" },
        { id: "plan", name: "Plan/Next Steps", type: "textarea" },
        // Drug Testing fields - Chain of Custody (required for all)
        { id: "chain_of_custody", name: "Chain of Custody Followed?", type: "select", options: ["Yes", "No"] },

        // DST-SP (Sweat Patch) specific fields
        { id: "patch_removed", name: "Was the sweat patch removed?", type: "select", options: ["Yes", "No"] },
        { id: "new_patch_applied", name: "Was a new patch applied?", type: "select", options: ["Yes", "No"] },
        { id: "client_willing_continue", name: "Was the client willing to continue?", type: "select", options: ["Yes", "No"] },
        { id: "test_mailed", name: "Was the test mailed for confirmation?", type: "select", options: ["Yes", "No"] },
        { id: "sp_date_sent", name: "Date Test Sent", type: "date" },
        // DST-SP Results fields (entered later when results come back)
        {
          id: "sp_test_result",
          name: "Sweat Patch Result",
          type: "select",
          options: ["Negative", "Positive", "Tampered"]
        },
        { id: "sp_client_admitted_use", name: "Did the client admit to using?", type: "select", options: ["Yes", "No"] },
        { id: "sp_non_admission_explanation", name: "If client did not admit, document explanation", type: "textarea" },
        {
          id: "sp_drugs_tested_positive",
          name: "Drugs Tested Positive For (select all that apply)",
          type: "multiselect",
          options: ["Alcohol", "Amphetamines", "Barbiturates", "Benzodiazepines", "Buprenorphine", "Cocaine", "EDDP (Methadone Metabolite)", "Fentanyl", "Marijuana (THC)", "MDMA (Ecstasy)", "Methadone", "Methamphetamine", "Opiates", "Oxycodone", "Phencyclidine (PCP)", "Tramadol", "Tricyclic Antidepressants", "Other"]
        },
        { id: "sp_other_drug_specify", name: "If Other, please specify", type: "text" },
        { id: "sp_tampered_explanation", name: "Document tampered circumstances", type: "textarea" },

        // DST-U (Urinalysis) and DST-MS (Mouth Swab) specific fields
        {
          id: "test_result",
          name: "Test Result",
          type: "select",
          options: ["Negative", "Positive", "Refusal"]
        },
        { id: "client_admitted_use", name: "Did the client admit to using?", type: "select", options: ["Yes", "No"] },
        { id: "non_admission_explanation", name: "If client did not admit, document explanation", type: "textarea" },
        {
          id: "drugs_tested_positive",
          name: "Drugs Tested Positive For (select all that apply)",
          type: "multiselect",
          options: ["Alcohol", "Amphetamines", "Barbiturates", "Benzodiazepines", "Buprenorphine", "Cocaine", "EDDP (Methadone Metabolite)", "Fentanyl", "Marijuana (THC)", "MDMA (Ecstasy)", "Methadone", "Methamphetamine", "Opiates", "Oxycodone", "Phencyclidine (PCP)", "Tramadol", "Tricyclic Antidepressants", "Other"]
        },
        { id: "other_drug_specify", name: "If Other, please specify", type: "text" },
        { id: "refusal_reason", name: "Document refusal reason/circumstances", type: "textarea" },

        // Lab submission fields (all drug testing types)
        { id: "sent_to_lab", name: "Sent to Lab?", type: "select", options: ["Yes", "No"] },
        { id: "not_sent_to_lab_reason", name: "Reason Not Sent to Lab", type: "textarea" },
        { id: "lab_result_text", name: "Lab Results", type: "textarea" },

        // Legacy fields kept for backward compatibility
	        { id: "client_admission", name: "Client Admissions", type: "textarea" },
	        { id: "engagement", name: "Engagement/Support", type: "textarea" },
	        // Cancellation / No-Show contract requirements
	        { id: "cancellation_notification", name: "Notification to DHHS Case Manager", type: "textarea" },
	        { id: "cancellation_service_prep", name: "Service Prep (Family Support/Visitation)", type: "textarea" },
	        { id: "cancellation_pre_call", name: "Pre-Call Attempt (Drug Testing)", type: "textarea" },
	        { id: "cancellation_en_route", name: 'Were you \"En Route\" when cancellation happened?', type: "select", options: ["Yes", "No"] },
	        { id: "cancellation_will_makeup", name: "Will this visit be made up?", type: "select", options: ["Yes", "No"] },
	        { id: "cancellation_makeup_date", name: "When will the visit be made up?", type: "text" },
	        { id: "cancellation_no_makeup_reason", name: "Why will the visit not be made up?", type: "textarea" },
	        { id: "weather_explanation", name: "Weather Explanation", type: "textarea" },
	      ];

	      const SERVICE_CONFIGS = {
	        "OHFS/IHFS": ["participants", "visit_narrative", "safety_concern_present", "interventions", "plan"],
	        OHFS: ["participants", "visit_narrative", "safety_concern_present", "interventions", "plan"],
	        IHFS: ["participants", "visit_narrative", "safety_concern_present", "interventions", "plan"],
	        PTSV: ["participants", "visit_narrative", "interactions", "parenting_skills", "safety_concern_present", "interventions", "plan"],
	        "PTSV-C": ["participants", "visit_narrative", "interactions", "parenting_skills", "safety_concern_present", "interventions", "plan"],
	        // DST-SP: Sweat Patch - chain of custody + patch-specific fields + date sent + results
	        "DST-SP": ["chain_of_custody", "patch_removed", "new_patch_applied", "client_willing_continue", "test_mailed", "sp_date_sent", "sp_test_result"],
	        // DST-U: Urinalysis - chain of custody + test result with conditional fields
	        "DST-U": ["chain_of_custody", "test_result"],
	        // DST-MS: Mouth Swab - same as urinalysis
	        "DST-MS": ["chain_of_custody", "test_result"],
	        // DST-HF: Hair Follicle - chain of custody + test result
	        "DST-HF": ["chain_of_custody", "test_result"],
	        default: ["participants", "visit_narrative", "plan"],
	      };

	      // Safety assessment helper - check if service type uses safety assessment
	      const usesSafetyAssessment = (serviceType) => {
	        return ["OHFS/IHFS", "OHFS", "IHFS", "PTSV", "PTSV-C"].includes(serviceType);
	      };

	      // Drug testing helper - check if service type is drug testing
	      const isDrugTestingService = (serviceType) => {
	        return ["DST-SP", "DST-U", "DST-MS", "DST-HF"].includes(serviceType);
	      };

	      // Drug testing helper - check if UA, MS, or HF (not sweat patch)
	      const isUAorMS = (serviceType) => {
	        return ["DST-U", "DST-MS", "DST-HF"].includes(serviceType);
	      };

      // --- UI Helpers ---

      const InputField = ({ label, type = "text", value, onChange, placeholder, required = false, options = [], children, ariaLabel, ariaDescribedBy }) => {
        const baseClass =
          "w-full px-4 py-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] transition-colors shadow-sm text-gray-900 bg-white text-base";
        const errorClass = "border-red-400 focus:ring-red-500 focus:border-red-500";

        // Validation state
        const [touched, setTouched] = useState(false);
        const [validationError, setValidationError] = useState("");

        // Validate on blur for time and date fields
        const validateInput = (val) => {
          if (!val) {
            setValidationError("");
            return;
          }
          if (type === "time" && !isValidTime(val)) {
            setValidationError("Invalid time format (HH:MM)");
          } else if (type === "date" && !isValidDate(val)) {
            setValidationError("Invalid date");
          } else {
            setValidationError("");
          }
        };

        const handleBlur = () => {
          setTouched(true);
          validateInput(value);
        };

        const inputId = `input-${label?.replace(/\s+/g, "-").toLowerCase()}`;
        const hasError = touched && validationError;
        const inputClasses = `${baseClass} ${hasError ? errorClass : ""}`;

        return (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700">
                {label} {required && <span className="text-red-500" aria-label="required">*</span>}
              </label>
              {children}
            </div>

            {type === "textarea" ? (
              <textarea
                id={inputId}
                value={value}
                onChange={onChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                rows={6}
                className={inputClasses}
                aria-label={ariaLabel || label}
                aria-describedby={ariaDescribedBy}
                aria-required={required}
              />
            ) : type === "select" ? (
              <select
                id={inputId}
                value={value}
                onChange={onChange}
                className={inputClasses}
                aria-label={ariaLabel || label}
                aria-describedby={ariaDescribedBy}
                aria-required={required}
              >
                <option value="">-- Select --</option>
                {options.map((opt, idx) => {
                  const isObj = opt && typeof opt === "object";
                  const optionValue = isObj ? opt.value : opt;
                  const optionLabel = isObj ? opt.label : opt;
                  return (
                    <option key={idx} value={optionValue}>
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
            ) : type === "multiselect" ? (
              <div className="space-y-2 p-3 border border-gray-300 rounded-lg bg-white max-h-48 overflow-y-auto">
                {options.map((opt, idx) => {
                  const isObj = opt && typeof opt === "object";
                  const optionValue = isObj ? opt.value : opt;
                  const optionLabel = isObj ? opt.label : opt;
                  const selectedValues = Array.isArray(value) ? value : (value ? value.split(",").map(v => v.trim()) : []);
                  const isChecked = selectedValues.includes(optionValue);
                  return (
                    <label key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let newValues;
                          if (e.target.checked) {
                            newValues = [...selectedValues, optionValue];
                          } else {
                            newValues = selectedValues.filter(v => v !== optionValue);
                          }
                          onChange({ target: { value: newValues.join(", ") } });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
                      />
                      <span className="text-sm text-gray-700">{optionLabel}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <input
                id={inputId}
                type={type}
                value={value}
                onChange={onChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={inputClasses}
                aria-label={ariaLabel || label}
                aria-describedby={ariaDescribedBy}
                aria-required={required}
                aria-invalid={hasError ? "true" : undefined}
              />
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-600" role="alert">{validationError}</p>
            )}
          </div>
        );
      };

      const appendText = (current, addition) => {
        const base = String(current || "").trim();
        const add = String(addition || "").trim();
        if (!add) return base;
        if (!base) return add;
        return `${base}\n${add}`;
      };

      const blobToDataUrl = (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("FileReader error"));
          reader.readAsDataURL(blob);
        });

      const DictationButton = ({ onText, className = "", title = "Dictate", prompt = "" }) => {
        const [state, setState] = useState("idle"); // idle | recording | transcribing
        const mediaRecorderRef = useRef(null);
        const chunksRef = useRef([]);
        const streamRef = useRef(null);

        const stopStream = () => {
          try {
            streamRef.current?.getTracks?.().forEach((t) => t.stop());
          } catch {}
          streamRef.current = null;
        };

        useEffect(() => () => stopStream(), []);

        const start = async () => {
          if (!navigator.mediaDevices?.getUserMedia) {
            alert("This browser doesn't support microphone recording.");
            return;
          }

          setState("recording");
          chunksRef.current = [];
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
          const mimeType =
            preferred.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";

          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorder.onstop = async () => {
            try {
              setState("transcribing");
              const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
              const dataUrl = await blobToDataUrl(blob);
              const resp = await authFetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioBase64: dataUrl,
                  mimeType: blob.type || "audio/webm",
                  filename: blob.type.includes("mp4") ? "audio.m4a" : "audio.webm",
                  prompt: prompt || undefined,
                }),
              });
              const data = await resp.json().catch(() => ({}));
              if (!resp.ok) throw new Error(data?.error || `Transcription failed (${resp.status})`);
              const text = String(data?.text || "").trim();
              if (text && typeof onText === "function") onText(text);
            } catch (err) {
              alert(String(err?.message || err));
            } finally {
              stopStream();
              setState("idle");
            }
          };

          recorder.start();
        };

        const stop = async () => {
          try {
            mediaRecorderRef.current?.stop?.();
          } catch {
            stopStream();
            setState("idle");
          }
        };

        const isRecording = state === "recording";
        const isTranscribing = state === "transcribing";
        const label = isTranscribing ? "Transcribing…" : isRecording ? "Stop" : "Dictate";
        const icon = isTranscribing ? "LoaderCircle" : isRecording ? "Square" : "Mic";

        return (
          <button
            type="button"
            title={title}
            disabled={isTranscribing}
            onClick={() => (isRecording ? stop() : start())}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[var(--brand-navy)] hover:bg-slate-50 disabled:opacity-60 ${className}`}
          >
            <LucideIcon name={icon} className={`w-4 h-4 ${isTranscribing ? "animate-spin" : ""}`} />
            {label}
          </button>
        );
      };

      // --- Authorization Form Component ---
      function AuthorizationForm({ existingAuth, onSave, onCancel }) {
        const [formData, setFormData] = useState({
          start_date: existingAuth?.start_date || "",
          end_date: existingAuth?.end_date || "",
          service_type: existingAuth?.service_type || "", // PTSV, IHFS, DST, etc.
          units_per_week: existingAuth?.units_per_week || "",
          total_units: existingAuth?.total_units || "",
          notes: existingAuth?.notes || "",
          adjustments: Array.isArray(existingAuth?.adjustments) ? existingAuth.adjustments : [],
          is_archived: existingAuth?.is_archived || false,
          archived_date: existingAuth?.archived_date || "",
          archived_reason: existingAuth?.archived_reason || ""
        });

        // Service type options with grouping
        const SERVICE_TYPE_OPTIONS = [
          { value: "OHFS/IHFS", label: "OHFS/IHFS - Family Support", group: "Family Support" },
          { value: "PTSV", label: "PTSV - Parenting Time / Supervised Visitation", group: "Visits" },
          { value: "DST-U", label: "DST-U - Drug Testing (Urinalysis)", group: "Drug Testing" },
          { value: "DST-MS", label: "DST-MS - Drug Testing (Mouth Swab)", group: "Drug Testing" },
          { value: "DST-SP", label: "DST-SP - Drug Testing (Sweat Patch)", group: "Drug Testing" },
          { value: "DST-HF", label: "DST-HF - Drug Testing (Hair Follicle)", group: "Drug Testing" },
        ];

        const handleSubmit = (e) => {
          e.preventDefault();
          if (!formData.start_date || !formData.end_date) {
            alert("Start and end dates are required.");
            return;
          }
          if (!formData.service_type) {
            alert("Service type is required.");
            return;
          }
          onSave(formData);
        };

        const addAdjustment = (type) => {
          const newAdj = {
            id: Date.now().toString(),
            type: type.startsWith("rate") ? "rate_increase" : "units_increase",
            amount: "",
            effective_date: formData.start_date || new Date().toISOString().split("T")[0],
            note: ""
          };
          setFormData((p) => ({ ...p, adjustments: [...p.adjustments, newAdj] }));
        };

        const updateAdjustment = (idx, field, value) => {
          setFormData((p) => {
            const updated = [...p.adjustments];
            updated[idx] = { ...updated[idx], [field]: value };
            return { ...p, adjustments: updated };
          });
        };

        const removeAdjustment = (idx) => {
          setFormData((p) => ({
            ...p,
            adjustments: p.adjustments.filter((_, i) => i !== idx)
          }));
        };

        // Calculate duration for display
        const durationDisplay = useMemo(() => {
          if (!formData.start_date || !formData.end_date) return "—";
          const start = new Date(formData.start_date);
          const end = new Date(formData.end_date);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return "—";
          const diffMs = end.getTime() - start.getTime();
          const totalDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
          const weeks = Math.floor(totalDays / 7);
          const days = totalDays % 7;
          if (weeks === 0 && days === 0) return "0 days";
          const parts = [];
          if (weeks > 0) parts.push(`${weeks} week${weeks !== 1 ? "s" : ""}`);
          if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
          return parts.join(" ");
        }, [formData.start_date, formData.end_date]);

        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Authorization Period */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">Authorization Period</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                  <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 font-medium">
                    {durationDisplay}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Type */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">Service Type *</div>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData((p) => ({ ...p, service_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select service type...</option>
                <optgroup label="Visits">
                  {SERVICE_TYPE_OPTIONS.filter(o => o.group === "Visits").map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Family Support">
                  {SERVICE_TYPE_OPTIONS.filter(o => o.group === "Family Support").map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Drug Testing">
                  {SERVICE_TYPE_OPTIONS.filter(o => o.group === "Drug Testing").map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">Each authorization is tracked separately by service type</p>
            </div>

            {/* Unit Allocation */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">Unit Allocation</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Units Per Week</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.units_per_week}
                    onChange={(e) => setFormData((p) => ({ ...p, units_per_week: e.target.value }))}
                    placeholder="e.g., 10"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Total Authorized Units</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.total_units}
                    onChange={(e) => setFormData((p) => ({ ...p, total_units: e.target.value }))}
                    placeholder="e.g., 80"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Adjustments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700">Adjustments (Optional)</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addAdjustment("rate")}
                    className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                  >
                    <LucideIcon name="TrendingUp" className="w-3 h-3" />
                    Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => addAdjustment("units")}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                  >
                    <LucideIcon name="Plus" className="w-3 h-3" />
                    Units
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newAdj = {
                        id: Date.now().toString(),
                        type: "prior_usage",
                        amount: "",
                        effective_date: formData.start_date || new Date().toISOString().split("T")[0],
                        note: "Units used before tracking started"
                      };
                      setFormData((p) => ({ ...p, adjustments: [...p.adjustments, newAdj] }));
                    }}
                    className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-1"
                    title="Record units used before you started tracking in this system"
                  >
                    <LucideIcon name="Clock" className="w-3 h-3" />
                    Prior Usage
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                <strong>Prior Usage:</strong> Use this to record units already used before you started tracking. This prevents the "insufficient units" warning and correctly calculates your remaining balance.
              </p>

              {formData.adjustments.length > 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Date</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Type</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Amount</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Note</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.adjustments.map((adj, idx) => (
                        <tr key={adj.id || idx} className="border-b border-gray-100 last:border-0">
                          <td className="px-2 py-2">
                            <input
                              type="date"
                              value={adj.effective_date || ""}
                              onChange={(e) => updateAdjustment(idx, "effective_date", e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={adj.type || "units_increase"}
                              onChange={(e) => updateAdjustment(idx, "type", e.target.value)}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${
                                adj.type?.startsWith("rate") ? "border-purple-300 bg-purple-50"
                                : adj.type === "prior_usage" ? "border-amber-300 bg-amber-50"
                                : "border-gray-300"
                              }`}
                            >
                              <optgroup label="Rate (units/week)">
                                <option value="rate_increase">Rate +</option>
                                <option value="rate_decrease">Rate -</option>
                              </optgroup>
                              <optgroup label="Total Units">
                                <option value="units_increase">Units +</option>
                                <option value="units_decrease">Units -</option>
                              </optgroup>
                              <optgroup label="Prior Tracking">
                                <option value="prior_usage">Prior Usage (used before system)</option>
                              </optgroup>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={adj.amount || ""}
                              onChange={(e) => updateAdjustment(idx, "amount", e.target.value)}
                              placeholder="0"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={adj.note || ""}
                              onChange={(e) => updateAdjustment(idx, "note", e.target.value)}
                              placeholder="Optional..."
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeAdjustment(idx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <LucideIcon name="Trash2" className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">No adjustments. Add rate or unit adjustments if needed.</div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g., Initial authorization, Renewed, etc."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Archive Section - Only show when editing existing auth */}
            {existingAuth && (
              <div className={`p-4 rounded-lg border ${formData.is_archived ? "bg-gray-100 border-gray-300" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-700">
                      {formData.is_archived ? "Authorization Archived" : "Archive This Authorization"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formData.is_archived
                        ? "This authorization is archived and won't be used for tracking."
                        : "Archive instead of delete to keep the history but stop tracking."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({
                      ...p,
                      is_archived: !p.is_archived,
                      archived_date: !p.is_archived ? new Date().toISOString().split("T")[0] : "",
                      archived_reason: !p.is_archived ? p.archived_reason : ""
                    }))}
                    className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${
                      formData.is_archived
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-600 text-white hover:bg-gray-700"
                    }`}
                  >
                    <LucideIcon name={formData.is_archived ? "RotateCcw" : "Archive"} className="w-4 h-4" />
                    {formData.is_archived ? "Restore" : "Archive"}
                  </button>
                </div>
                {formData.is_archived && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Archived Date</label>
                      <input
                        type="date"
                        value={formData.archived_date}
                        onChange={(e) => setFormData((p) => ({ ...p, archived_date: e.target.value }))}
                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Reason (Optional)</label>
                      <input
                        type="text"
                        value={formData.archived_reason}
                        onChange={(e) => setFormData((p) => ({ ...p, archived_reason: e.target.value }))}
                        placeholder="e.g., Service ended, Renewed with new auth..."
                        className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <LucideIcon name="Save" className="w-4 h-4" />
                {existingAuth ? "Update Authorization" : "Add Authorization"}
              </button>
            </div>
          </form>
        );
      }

      // --- Client Profile Editor (stable component) ---
		      function ClientProfileEditor({
		        familyDirectoryOptions,
		        allFamilyDirectoryOptions,
		        selectedProfileKey,
		        onSelectProfileKey,
		        onSaveProfile,
		        onToast,
		        onAfterSave,
		        initialDraft,
		        initialGoals,
		        entries = [], // Case note entries for calculating units used
		        showArchivedProfiles,
		        setShowArchivedProfiles,
		        DISCHARGE_STATUS_OPTIONS,
		        getDischargeLabel,
		      }) {
		        const [showDischargeModal, setShowDischargeModal] = useState(false);
		        const GENDER_OPTIONS = ["Male", "Female", "Other"];
		        const AGE_RANGE_OPTIONS = ["0-5", "6-12", "13-19"];
		        const POVERTY_LEVEL_OPTIONS = ["Below Poverty Level", "At Poverty Level", "Above Poverty Level"];
		        const PARENT_RELATIONSHIP_OPTIONS = ["Mother", "Father", "Guardian", "Other"];
		        const HOUSEHOLD_TYPE_OPTIONS = ["Single Mother", "Single Father", "Two Parent", "Guardian/Other"];
		        const PARENT_AGE_RANGE_OPTIONS = ["19-25", "26-35", "36-45", "46+"];
		        const migrateAgeRange = (val) => {
		          const v = String(val || "").trim();
		          if (v === "6-10") return "6-12";
		          if (v === "11-14") return "";
		          if (v === "15-19") return "13-19";
		          return v;
		        };
		        const UNITS_PERIOD_OPTIONS = [
		          { value: "weekly", label: "Per Week" },
		          { value: "monthly", label: "Per Month" },
		          { value: "total", label: "Total" },
		        ];
		        const INITIAL_DRAFT = {
		          Family_ID: "",
		          Case_Name: "",
		          MC_Number: "",
		          CFSS: "",
		          Typical_Location: "",
		          Poverty_Level: "",
		          Household_Type: "",
		          Authorized_Units: "",
		          Units_Per_Week: "",
		          Auth_Start_Date: "",
		          Auth_End_Date: "",
		          Unit_Adjustments: [], // Array of {id, type, amount, effective_date, note} - type: "units_increase", "units_decrease", "rate_increase", "rate_decrease"
		          Authorization_History: [], // Array of {id, start_date, end_date, units_per_week, total_units, adjustments: [], created_at, notes}
		          Parent_1: "",
		          Parent_1_Gender: "",
		          Parent_2: "",
		          Parent_2_Gender: "",
		          Parent_3: "",
		          Parent_3_Gender: "",
		          Parent_1_Relationship: "",
		          Parent_1_Age_Range: "",
		          Parent_2_Relationship: "",
		          Parent_2_Age_Range: "",
		          Parent_3_Relationship: "",
		          Parent_3_Age_Range: "",
		          Head_of_Household: "",
		          Child_1: "",
		          Child_1_Gender: "",
		          Child_1_Age_Range: "",
		          Child_2: "",
		          Child_2_Gender: "",
		          Child_2_Age_Range: "",
		          Child_3: "",
		          Child_3_Gender: "",
		          Child_3_Age_Range: "",
		          Child_4: "",
		          Child_4_Gender: "",
		          Child_4_Age_Range: "",
		          Child_5: "",
		          Child_5_Gender: "",
		          Child_5_Age_Range: "",
		          Child_6: "",
		          Child_6_Gender: "",
		          Child_6_Age_Range: "",
		          Child_7: "",
		          Child_7_Gender: "",
		          Child_7_Age_Range: "",
		          goalsText: "",
		          // Discharge/Archive fields
		          is_archived: false,
		          discharge_status: "", // "successful", "unsuccessful", "family_circumstances", "dhhs_case_ended", "terminated_violence"
		          discharge_date: "",
		          discharge_notes: "",
		          // Service tracking dates
		          Service_Start_Date: "", // Date services began for this family
		          Service_End_Date: "",   // Date services ended (can be derived from discharge or auth end)
		          // Lead case and linked cases
		          is_lead_case: false,    // Whether this is designated as the lead case
		          lead_case_id: "",       // If this is a linked case, the ID of the lead case
		          linked_case_ids: [],    // If this is a lead case, array of linked case IDs
		        };
		        const [draft, setDraft] = useState({
		          ...INITIAL_DRAFT,
		        });
		        const [goalsList, setGoalsList] = useState([""]);
		        const [saving, setSaving] = useState(false);
		        const [showAuthHistoryModal, setShowAuthHistoryModal] = useState(false);
		        const [editingAuthId, setEditingAuthId] = useState(null);

		        // Find all active authorizations based on today's date (one per service type)
		        const activeAuthorizations = useMemo(() => {
		          const history = Array.isArray(draft.Authorization_History) ? draft.Authorization_History : [];
		          const today = new Date();
		          today.setHours(0, 0, 0, 0);

		          // Filter out archived authorizations - they shouldn't be active
		          const nonArchived = history.filter(auth => !auth.is_archived);

		          // Group by service type
		          const byServiceType = {};
		          nonArchived.forEach(auth => {
		            const svc = auth.service_type || "GENERAL";
		            if (!byServiceType[svc]) byServiceType[svc] = [];
		            byServiceType[svc].push(auth);
		          });

		          // Find active auth for each service type
		          const activeByService = {};
		          Object.entries(byServiceType).forEach(([svc, auths]) => {
		            // Sort by start_date descending
		            const sorted = [...auths].sort((a, b) => {
		              const dateA = new Date(a.start_date);
		              const dateB = new Date(b.start_date);
		              return dateB.getTime() - dateA.getTime();
		            });

		            // Find auth that covers today
		            for (const auth of sorted) {
		              const start = new Date(auth.start_date);
		              const end = new Date(auth.end_date);
		              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
		                start.setHours(0, 0, 0, 0);
		                end.setHours(23, 59, 59, 999);
		                if (today >= start && today <= end) {
		                  activeByService[svc] = auth;
		                  return;
		                }
		              }
		            }

		            // Check for future auths
		            const futureAuths = sorted.filter(auth => {
		              const start = new Date(auth.start_date);
		              return !isNaN(start.getTime()) && start > today;
		            });
		            if (futureAuths.length > 0) {
		              activeByService[svc] = futureAuths[futureAuths.length - 1];
		              return;
		            }

		            // Fall back to most recent past
		            if (sorted[0]) activeByService[svc] = sorted[0];
		          });

		          return activeByService;
		        }, [draft.Authorization_History]);

		        // For backwards compatibility, get the first active authorization (or legacy "GENERAL")
		        const activeAuthorization = useMemo(() => {
		          const auths = Object.values(activeAuthorizations);
		          return auths[0] || null;
		        }, [activeAuthorizations]);

		        // Use active authorization values if available, otherwise use legacy fields
		        const effectiveAuth = useMemo(() => {
		          if (activeAuthorization) {
		            return {
		              startDate: activeAuthorization.start_date,
		              endDate: activeAuthorization.end_date,
		              unitsPerWeek: activeAuthorization.units_per_week,
		              totalUnits: activeAuthorization.total_units,
		              adjustments: Array.isArray(activeAuthorization.adjustments) ? activeAuthorization.adjustments : [],
		              isFromHistory: true,
		              authId: activeAuthorization.id
		            };
		          }
		          // Fallback to legacy fields
		          return {
		            startDate: draft.Auth_Start_Date,
		            endDate: draft.Auth_End_Date,
		            unitsPerWeek: draft.Units_Per_Week,
		            totalUnits: draft.Authorized_Units,
		            adjustments: Array.isArray(draft.Unit_Adjustments) ? draft.Unit_Adjustments : [],
		            isFromHistory: false,
		            authId: null
		          };
		        }, [activeAuthorization, draft.Auth_Start_Date, draft.Auth_End_Date, draft.Units_Per_Week, draft.Authorized_Units, draft.Unit_Adjustments]);

		        // Calculate auth duration in weeks (uses effectiveAuth)
		        const authDurationWeeks = useMemo(() => {
		          if (!effectiveAuth.startDate || !effectiveAuth.endDate) return 0;
		          const start = new Date(effectiveAuth.startDate);
		          const end = new Date(effectiveAuth.endDate);
		          if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
		          const diffMs = end.getTime() - start.getTime();
		          return Math.max(0, diffMs / (7 * 24 * 60 * 60 * 1000));
		        }, [effectiveAuth.startDate, effectiveAuth.endDate]);

		        // Format duration for display (uses effectiveAuth)
		        const authDurationDisplay = useMemo(() => {
		          if (!effectiveAuth.startDate || !effectiveAuth.endDate) return "—";
		          const start = new Date(effectiveAuth.startDate);
		          const end = new Date(effectiveAuth.endDate);
		          if (isNaN(start.getTime()) || isNaN(end.getTime())) return "—";
		          const diffMs = end.getTime() - start.getTime();
		          const totalDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
		          const weeks = Math.floor(totalDays / 7);
		          const days = totalDays % 7;
		          if (weeks === 0 && days === 0) return "0 days";
		          const parts = [];
		          if (weeks > 0) parts.push(`${weeks} week${weeks !== 1 ? "s" : ""}`);
		          if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
		          return parts.join(" ");
		        }, [effectiveAuth.startDate, effectiveAuth.endDate]);

		        // Calculate total unit adjustments (adds/removes from authorized units) - uses effectiveAuth
		        const totalUnitAdjustments = useMemo(() => {
		          const adjustments = effectiveAuth.adjustments;
		          return adjustments.reduce((sum, adj) => {
		            const amount = parseFloat(adj.amount) || 0;
		            // Skip prior_usage - it's counted separately as "already used"
		            if (adj.type === "prior_usage") return sum;
		            if (adj.type === "units_increase" || adj.type === "increase") return sum + amount;
		            if (adj.type === "units_decrease" || adj.type === "decrease") return sum - amount;
		            return sum;
		          }, 0);
		        }, [effectiveAuth.adjustments]);

		        // Calculate prior usage units (units used before tracking started)
		        const priorUsageUnits = useMemo(() => {
		          if (!effectiveAuth.adjustments?.length) return 0;
		          return effectiveAuth.adjustments.reduce((sum, adj) => {
		            if (adj.type === "prior_usage") {
		              return sum + (parseFloat(adj.amount) || 0);
		            }
		            return sum;
		          }, 0);
		        }, [effectiveAuth.adjustments]);

		        // Calculate adjusted total (base + unit adjustments) - uses effectiveAuth
		        const authorizedUnits = parseFloat(effectiveAuth.totalUnits) || 0;
		        const adjustedTotal = authorizedUnits + totalUnitAdjustments;

		        // Calculate units required with rate adjustments over time - uses effectiveAuth
		        const baseUnitsPerWeek = parseFloat(effectiveAuth.unitsPerWeek) || 0;
		        const { unitsRequired, currentRate, rateSegments } = useMemo(() => {
		          if (!effectiveAuth.startDate || !effectiveAuth.endDate) {
		            return { unitsRequired: 0, currentRate: baseUnitsPerWeek, rateSegments: [] };
		          }
		          const authStart = new Date(effectiveAuth.startDate);
		          const authEnd = new Date(effectiveAuth.endDate);
		          if (isNaN(authStart.getTime()) || isNaN(authEnd.getTime())) {
		            return { unitsRequired: 0, currentRate: baseUnitsPerWeek, rateSegments: [] };
		          }
		          authStart.setHours(0, 0, 0, 0);
		          authEnd.setHours(23, 59, 59, 999);

		          // Collect rate adjustments and sort by date
		          const rateChanges = effectiveAuth.adjustments
		            .filter(adj => adj.type === "rate_increase" || adj.type === "rate_decrease")
		            .map(adj => ({
		              date: new Date(adj.effective_date),
		              change: adj.type === "rate_increase" ? (parseFloat(adj.amount) || 0) : -(parseFloat(adj.amount) || 0)
		            }))
		            .filter(rc => !isNaN(rc.date.getTime()) && rc.date >= authStart && rc.date <= authEnd)
		            .sort((a, b) => a.date.getTime() - b.date.getTime());

		          // Build rate segments
		          const segments = [];
		          let currentSegmentStart = authStart;
		          let runningRate = baseUnitsPerWeek;

		          for (const rc of rateChanges) {
		            if (rc.date > currentSegmentStart) {
		              const segmentEnd = new Date(rc.date.getTime() - 1);
		              const segmentWeeks = Math.max(0, (segmentEnd.getTime() - currentSegmentStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
		              segments.push({ start: currentSegmentStart, end: segmentEnd, rate: runningRate, weeks: segmentWeeks });
		            }
		            runningRate += rc.change;
		            currentSegmentStart = rc.date;
		          }

		          // Final segment to auth end
		          if (currentSegmentStart <= authEnd) {
		            const segmentWeeks = Math.max(0, (authEnd.getTime() - currentSegmentStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
		            segments.push({ start: currentSegmentStart, end: authEnd, rate: runningRate, weeks: segmentWeeks });
		          }

		          // Calculate total units required
		          const totalRequired = segments.reduce((sum, seg) => sum + (seg.rate * seg.weeks), 0);

		          return { unitsRequired: totalRequired, currentRate: runningRate, rateSegments: segments };
		        }, [effectiveAuth.startDate, effectiveAuth.endDate, effectiveAuth.adjustments, baseUnitsPerWeek]);

		        // For display purposes, use current rate if we have rate adjustments, otherwise base rate
		        const effectiveUnitsPerWeek = currentRate;

		        // Calculate shortage (positive = not enough units)
		        // If prior_usage is set, the shortage warning shouldn't fire because user explicitly
		        // stated how many units were used before tracking started
		        const unitsShortage = unitsRequired - adjustedTotal;
		        const hasShortage = unitsRequired > 0 && unitsShortage > 0 && priorUsageUnits === 0;

		        // Calculate days until auth expires - uses effectiveAuth
		        const daysUntilExpiry = useMemo(() => {
		          if (!effectiveAuth.endDate) return null;
		          const end = new Date(effectiveAuth.endDate);
		          if (isNaN(end.getTime())) return null;
		          const now = new Date();
		          now.setHours(0, 0, 0, 0);
		          end.setHours(0, 0, 0, 0);
		          const diffMs = end.getTime() - now.getTime();
		          return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
		        }, [effectiveAuth.endDate]);

		        // Calculate units used for the selected profile (within auth period) - uses effectiveAuth
		        const unitsUsed = useMemo(() => {
		          if (!selectedProfileKey || !entries.length) return { hours: 0, occurrences: 0 };

		          const selectedProfile = familyDirectoryOptions.find((o) => o.key === selectedProfileKey);
		          if (!selectedProfile) return { hours: 0, occurrences: 0 };

		          // Use auth dates from effectiveAuth if available, otherwise fall back to all-time
		          const authStart = effectiveAuth.startDate ? new Date(effectiveAuth.startDate) : new Date(0);
		          const authEnd = effectiveAuth.endDate ? new Date(effectiveAuth.endDate) : new Date(9999, 11, 31);
		          authStart.setHours(0, 0, 0, 0);
		          authEnd.setHours(23, 59, 59, 999);

		          const profileEntries = entries.filter((e) => {
		            const entryKey = e.family_directory_key || e.family_id;
		            if (entryKey !== selectedProfileKey && entryKey !== selectedProfile.familyId) return false;
		            const entryDate = e.date ? new Date(e.date) : null;
		            return entryDate && entryDate >= authStart && entryDate <= authEnd;
		          });

		          let totalHours = 0;
		          let drugTestCount = 0;

		          profileEntries.forEach((e) => {
		            const serviceType = String(e.service_type || "").toUpperCase();
		            const isDrugTest = serviceType.startsWith("DST");

		            if (isDrugTest) {
		              drugTestCount += 1;
		            } else if (e.start_time && e.end_time) {
		              const [startH, startM] = e.start_time.split(":").map(Number);
		              const [endH, endM] = e.end_time.split(":").map(Number);
		              const startMins = (startH || 0) * 60 + (startM || 0);
		              const endMins = (endH || 0) * 60 + (endM || 0);
		              const durationHours = Math.max(0, (endMins - startMins) / 60);
		              totalHours += durationHours;
		            }
		          });

		          return { hours: Math.round(totalHours * 100) / 100, occurrences: drugTestCount };
		        }, [selectedProfileKey, entries, familyDirectoryOptions, effectiveAuth.startDate, effectiveAuth.endDate]);

		        // Total units used = tracked usage + prior usage (from before system started)
		        const trackedUnitsUsed = unitsUsed.hours + unitsUsed.occurrences;
		        const totalUnitsUsed = trackedUnitsUsed + priorUsageUnits;
		        const unitsBalance = adjustedTotal - totalUnitsUsed;

		        // Check if running low (less than 2 weeks of units remaining at current rate)
		        const weeksOfUnitsLeft = effectiveUnitsPerWeek > 0 ? unitsBalance / effectiveUnitsPerWeek : null;
		        const isRunningLow = weeksOfUnitsLeft !== null && weeksOfUnitsLeft < 2 && weeksOfUnitsLeft >= 0;

		        useEffect(() => {
		          if (!initialDraft && !initialGoals) return;
		          const nextDraft = { ...INITIAL_DRAFT, ...(initialDraft || {}) };
		          const nextGoals = (Array.isArray(initialGoals) ? initialGoals : [])
		            .map((g) => String(g || "").trim())
		            .filter(Boolean)
		            .slice(0, 6);
		          setDraft(nextDraft);
		          setGoalsList(nextGoals.length ? nextGoals : [""]);
		        }, [initialDraft, initialGoals]);

		        useEffect(() => {
		          if (!selectedProfileKey) return;
		          const selected = familyDirectoryOptions.find((o) => o.key === selectedProfileKey);
		          if (!selected) return;
	          const nextGoals = String(selected.goalsText || "")
	            .split(/\r?\n/)
	            .map((l) => l.trim())
	            .filter(Boolean)
	            .slice(0, 6);
	          setGoalsList(nextGoals.length ? nextGoals : [""]);
	          setDraft({
	            Family_ID: selected.familyId || "",
	            Case_Name: selected.caseName || "",
	            MC_Number: selected.mcNumber || "",
	            CFSS: selected.cfss || "",
	            Typical_Location: selected.typicalLocation || "",
	            Poverty_Level: selected.raw?.Poverty_Level || "",
	            Authorized_Units: selected.raw?.Authorized_Units || "",
	            Units_Per_Week: selected.raw?.Units_Per_Week || "",
	            Auth_Start_Date: selected.raw?.Auth_Start_Date || "",
	            Auth_End_Date: selected.raw?.Auth_End_Date || "",
	            Unit_Adjustments: Array.isArray(selected.raw?.Unit_Adjustments) ? selected.raw.Unit_Adjustments : [],
	            Authorization_History: Array.isArray(selected.raw?.Authorization_History) ? selected.raw.Authorization_History : [],
	            Parent_1: selected.raw?.Parent_1 || "",
	            Parent_1_Gender: selected.raw?.Parent_1_Gender || "",
	            Parent_2: selected.raw?.Parent_2 || "",
	            Parent_2_Gender: selected.raw?.Parent_2_Gender || "",
	            Parent_3: selected.raw?.Parent_3 || "",
	            Parent_3_Gender: selected.raw?.Parent_3_Gender || "",
	            Parent_1_Relationship: selected.raw?.Parent_1_Relationship || "",
	            Parent_1_Age_Range: selected.raw?.Parent_1_Age_Range || "",
	            Parent_2_Relationship: selected.raw?.Parent_2_Relationship || "",
	            Parent_2_Age_Range: selected.raw?.Parent_2_Age_Range || "",
	            Parent_3_Relationship: selected.raw?.Parent_3_Relationship || "",
	            Parent_3_Age_Range: selected.raw?.Parent_3_Age_Range || "",
	            Head_of_Household: selected.raw?.Head_of_Household || "",
	            Household_Type: selected.raw?.Household_Type || "",
	            Child_1: selected.raw?.Child_1 || "",
	            Child_1_Gender: selected.raw?.Child_1_Gender || "",
	            Child_1_Age_Range: migrateAgeRange(selected.raw?.Child_1_Age_Range),
	            Child_2: selected.raw?.Child_2 || "",
	            Child_2_Gender: selected.raw?.Child_2_Gender || "",
	            Child_2_Age_Range: migrateAgeRange(selected.raw?.Child_2_Age_Range),
	            Child_3: selected.raw?.Child_3 || "",
	            Child_3_Gender: selected.raw?.Child_3_Gender || "",
	            Child_3_Age_Range: migrateAgeRange(selected.raw?.Child_3_Age_Range),
	            Child_4: selected.raw?.Child_4 || "",
	            Child_4_Gender: selected.raw?.Child_4_Gender || "",
	            Child_4_Age_Range: migrateAgeRange(selected.raw?.Child_4_Age_Range),
	            Child_5: selected.raw?.Child_5 || "",
	            Child_5_Gender: selected.raw?.Child_5_Gender || "",
	            Child_5_Age_Range: migrateAgeRange(selected.raw?.Child_5_Age_Range),
	            Child_6: selected.raw?.Child_6 || "",
	            Child_6_Gender: selected.raw?.Child_6_Gender || "",
	            Child_6_Age_Range: migrateAgeRange(selected.raw?.Child_6_Age_Range),
	            Child_7: selected.raw?.Child_7 || "",
	            Child_7_Gender: selected.raw?.Child_7_Gender || "",
	            Child_7_Age_Range: migrateAgeRange(selected.raw?.Child_7_Age_Range),
	            goalsText: selected.goalsText || "",
	            // Discharge/Archive fields
	            is_archived: selected.raw?.is_archived || false,
	            discharge_status: selected.raw?.discharge_status || "",
	            discharge_date: selected.raw?.discharge_date || "",
	            discharge_notes: selected.raw?.discharge_notes || "",
	            // Service tracking dates
	            Service_Start_Date: selected.raw?.Service_Start_Date || "",
	            Service_End_Date: selected.raw?.Service_End_Date || "",
	            // Lead case and linked cases
	            is_lead_case: selected.raw?.is_lead_case || false,
	            lead_case_id: selected.raw?.lead_case_id || "",
	            linked_case_ids: Array.isArray(selected.raw?.linked_case_ids) ? selected.raw.linked_case_ids : [],
	          });
	        }, [selectedProfileKey, familyDirectoryOptions]);

		        const syncGoalsTextFromList = (list) => {
		          const cleaned = (list || []).map((g) => String(g || "").trim()).filter(Boolean).slice(0, 6);
		          const goalsText = cleaned.join("\n");
		          setDraft((p) => ({ ...p, goalsText }));
		        };

		        const resetProfileForm = () => {
		          setDraft({ ...INITIAL_DRAFT });
		          setGoalsList([""]);
		          onSelectProfileKey("");
		        };

		        return (
		          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-none">
		            {/* Header */}
		            <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-200">
		              <div>
		                <div className="text-xl font-bold text-gray-900">Client Profile</div>
		                <div className="text-sm text-gray-500">Manage client details and goals</div>
		              </div>
		              <div className="flex items-center gap-3">
		                <Button
		                  variant="secondary"
		                  iconName="Plus"
		                  disabled={saving}
		                  className="rounded-lg px-5 h-11"
		                  onClick={() => {
		                    resetProfileForm();
		                    if (typeof onAfterSave === "function") onAfterSave();
		                  }}
		                >
		                  New Profile
		                </Button>
		                <Button
		                  variant="primary"
		                  iconName="Save"
		                  disabled={saving}
		                  className="rounded-lg px-6 h-11"
		                  onClick={async () => {
		                    setSaving(true);
		                    try {
		                      const cleanedGoals = (goalsList || []).map((g) => String(g || "").trim()).filter(Boolean).slice(0, 6);
		                      const payload = { ...draft, goalsText: cleanedGoals.join("\n") };
		                      // Pass selectedProfileKey as existingDocId to preserve identity on edits
		                      // For new profiles, selectedProfileKey will be empty, triggering auto-generation
		                      const savedDocId = await onSaveProfile(payload, selectedProfileKey || null);
		                      (typeof onToast === "function" ? onToast : (m) => alert(m))("Profile saved. You can continue editing.");
		                      // Update the selection to the new/existing doc ID
		                      if (savedDocId && !selectedProfileKey) {
		                        onSelectProfileKey(savedDocId);
		                        // Also update the draft's Family_ID to show the auto-generated ID
		                        setDraft((p) => ({ ...p, Family_ID: savedDocId }));
		                      }
		                    } catch (err) {
		                      alert(String(err?.message || err));
		                    } finally {
		                      setSaving(false);
		                    }
		                  }}
		                >
		                  Save Profile
		                </Button>
		              </div>
		            </div>

	            {/* Profile Information Section */}
	            <div className="mb-8">
	              <div className="flex items-center justify-between mb-4">
	                <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">Profile Information</div>
	                <div className="flex items-center gap-4">
	                  <button
	                    type="button"
	                    onClick={() => setShowArchivedProfiles(!showArchivedProfiles)}
	                    className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
	                      showArchivedProfiles
	                        ? "bg-gray-700 text-white"
	                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
	                    }`}
	                  >
	                    <LucideIcon name="Archive" className="w-3.5 h-3.5" />
	                    {showArchivedProfiles ? "Viewing Archived" : "View Archived"}
	                    {allFamilyDirectoryOptions && (
	                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
	                        {allFamilyDirectoryOptions.filter(o => o.isArchived).length}
	                      </span>
	                    )}
	                  </button>
	                </div>
	              </div>

	              {/* Archived banner */}
	              {draft.is_archived && (
	                <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-between">
	                  <div className="flex items-center gap-2">
	                    <LucideIcon name="Archive" className="w-5 h-5 text-gray-600" />
	                    <div>
	                      <div className="font-semibold text-gray-700">Archived Profile</div>
	                      <div className="text-sm text-gray-500">
	                        {draft.discharge_status && getDischargeLabel(draft.discharge_status)}
	                        {draft.discharge_date && ` • ${draft.discharge_date}`}
	                      </div>
	                    </div>
	                  </div>
	                  <button
	                    type="button"
	                    onClick={() => setDraft(p => ({ ...p, is_archived: false, discharge_status: "", discharge_date: "", discharge_notes: "" }))}
	                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
	                  >
	                    Restore to Active
	                  </button>
	                </div>
	              )}

	              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
	                <div className="col-span-2">
	                  <InputField
	                    label={showArchivedProfiles ? "Load Archived Profile" : "Load Existing Profile"}
	                    type="select"
	                    value={selectedProfileKey}
	                    onChange={(e) => onSelectProfileKey(e.target.value)}
	                    options={activeFamilyDirectoryOptions.map((o) => ({
	                      value: o.key,
	                      label: o.mcNumber
	                        ? `${o.caseName} (${o.mcNumber})`
	                        : o.caseName,
	                    }))}
	                  />
	                </div>
	                <div className="col-span-2">
	                  <InputField
	                    label="Case / Family Name"
	                    value={draft.Case_Name}
	                    onChange={(e) => setDraft((p) => ({ ...p, Case_Name: e.target.value }))}
	                  />
	                </div>
	                <InputField
	                  label="Master Case #"
	                  value={draft.MC_Number}
	                  onChange={(e) => setDraft((p) => ({ ...p, MC_Number: e.target.value }))}
	                />
	                <InputField
	                  label="Family ID"
	                  value={draft.Family_ID}
	                  onChange={(e) => setDraft((p) => ({ ...p, Family_ID: e.target.value }))}
	                />
	                <InputField label="CFSS" value={draft.CFSS} onChange={(e) => setDraft((p) => ({ ...p, CFSS: e.target.value }))} />
	                <InputField
	                  label="Poverty Level"
	                  type="select"
	                  value={draft.Poverty_Level}
	                  onChange={(e) => setDraft((p) => ({ ...p, Poverty_Level: e.target.value }))}
	                  options={POVERTY_LEVEL_OPTIONS.map((p) => ({ value: p, label: p }))}
	                />
	                <InputField
	                  label="Household Type"
	                  type="select"
	                  value={draft.Household_Type}
	                  onChange={(e) => setDraft((p) => ({ ...p, Household_Type: e.target.value }))}
	                  options={HOUSEHOLD_TYPE_OPTIONS.map((h) => ({ value: h, label: h }))}
	                />
	              </div>
	              <div className="mt-4">
	                <InputField
	                  label="Typical Location"
	                  value={draft.Typical_Location}
	                  onChange={(e) => setDraft((p) => ({ ...p, Typical_Location: e.target.value }))}
	                />
	              </div>

	              {/* Case Relationships Section */}
	              <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
	                <div className="text-sm font-bold text-purple-800 uppercase tracking-wide mb-4 flex items-center gap-2">
	                  <LucideIcon name="Link" className="w-4 h-4" />
	                  Case Relationships
	                </div>

	                <div className="space-y-4">
	                  {/* Is Lead Case Toggle */}
	                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100">
	                    <input
	                      type="checkbox"
	                      id="is_lead_case"
	                      checked={draft.is_lead_case || false}
	                      onChange={(e) => {
	                        const isLead = e.target.checked;
	                        setDraft((p) => ({
	                          ...p,
	                          is_lead_case: isLead,
	                          // If marking as lead case, clear any lead_case_id
	                          lead_case_id: isLead ? "" : p.lead_case_id
	                        }));
	                      }}
	                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
	                    />
	                    <label htmlFor="is_lead_case" className="flex-1 cursor-pointer">
	                      <div className="font-medium text-gray-800">Mark as Lead Case</div>
	                      <div className="text-xs text-gray-500">This case will be the primary case for linked cases</div>
	                    </label>
	                  </div>

	                  {/* Linked To (only show if NOT a lead case) */}
	                  {!draft.is_lead_case && (
	                    <div>
	                      <label className="block text-sm font-medium text-gray-700 mb-2">
	                        Link to Lead Case (Optional)
	                      </label>
	                      <select
	                        value={draft.lead_case_id || ""}
	                        onChange={(e) => setDraft((p) => ({ ...p, lead_case_id: e.target.value }))}
	                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
	                      >
	                        <option value="">-- No Lead Case --</option>
	                        {familyDirectoryOptions
	                          .filter(opt => opt.raw?.is_lead_case === true && opt.key !== selectedProfileKey)
	                          .map(opt => (
	                            <option key={opt.key} value={opt.key}>
	                              {opt.caseName} ({opt.mcNumber || opt.familyId}) {opt.isInactive ? "[Archived]" : ""}
	                            </option>
	                          ))
	                        }
	                      </select>
	                      <p className="text-xs text-gray-500 mt-1">
	                        Select a lead case if this case should be linked to another primary case
	                      </p>
	                    </div>
	                  )}

	                  {/* Display Linked Cases (only show if IS a lead case) */}
	                  {draft.is_lead_case && (
	                    <div>
	                      <label className="block text-sm font-medium text-gray-700 mb-2">
	                        Linked Cases
	                      </label>
	                      <div className="bg-white rounded-lg border border-purple-100 p-3">
	                        {(() => {
	                          const linkedCases = familyDirectoryOptions.filter(opt =>
	                            opt.raw?.lead_case_id === selectedProfileKey
	                          );
	                          if (linkedCases.length === 0) {
	                            return (
	                              <p className="text-sm text-gray-500 italic">
	                                No cases are currently linked to this lead case. Other cases can link to this one by selecting it as their lead case.
	                              </p>
	                            );
	                          }
	                          return (
	                            <ul className="space-y-2">
	                              {linkedCases.map(linked => (
	                                <li key={linked.key} className="flex items-center gap-2 text-sm">
	                                  <LucideIcon name="Link2" className="w-3 h-3 text-purple-600" />
	                                  <span className="font-medium">{linked.caseName}</span>
	                                  <span className="text-gray-500">({linked.mcNumber || linked.familyId})</span>
	                                  {linked.isInactive && (
	                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Archived</span>
	                                  )}
	                                </li>
	                              ))}
	                            </ul>
	                          );
	                        })()}
	                      </div>
	                    </div>
	                  )}

	                  {/* Show which case this is linked to (if applicable) */}
	                  {!draft.is_lead_case && draft.lead_case_id && (
	                    <div className="p-3 bg-purple-100 border border-purple-200 rounded-lg">
	                      <div className="flex items-center gap-2 text-sm">
	                        <LucideIcon name="Link2" className="w-4 h-4 text-purple-700" />
	                        <span className="font-medium text-purple-900">Linked to:</span>
	                        <span className="text-purple-800">
	                          {(() => {
	                            const leadCase = familyDirectoryOptions.find(opt => opt.key === draft.lead_case_id);
	                            return leadCase ? `${leadCase.caseName} (${leadCase.mcNumber || leadCase.familyId})` : "Unknown Case";
	                          })()}
	                        </span>
	                      </div>
	                    </div>
	                  )}
	                </div>
	              </div>

	              {/* Authorized Units Section */}
	              <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
	                <div className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-4 flex items-center justify-between">
	                  <div className="flex items-center gap-2">
	                    <LucideIcon name="Clock" className="w-4 h-4" />
	                    Authorized Units
	                    {effectiveAuth.isFromHistory && (
	                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium normal-case">
	                        Using: {effectiveAuth.startDate} to {effectiveAuth.endDate}
	                      </span>
	                    )}
	                  </div>
	                </div>

	                {/* Active Authorization Display (when using history) */}
	                {effectiveAuth.isFromHistory && (
	                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
	                    <div className="flex items-center justify-between">
	                      <div>
	                        <div className="text-xs font-semibold text-green-700 uppercase">Active Authorization</div>
	                        <div className="text-sm font-medium text-green-800 mt-1">
	                          {effectiveAuth.startDate} to {effectiveAuth.endDate} • {effectiveAuth.unitsPerWeek} units/week • {effectiveAuth.totalUnits} total units
	                        </div>
	                      </div>
	                      <button
	                        type="button"
	                        onClick={() => {
	                          setEditingAuthId(effectiveAuth.authId);
	                          setShowAuthHistoryModal(true);
	                        }}
	                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
	                      >
	                        <LucideIcon name="Pencil" className="w-3 h-3" />
	                        Edit
	                      </button>
	                    </div>
	                  </div>
	                )}

	                {/* Row 1: Authorization Period (Legacy - only show if not using history) */}
	                {!effectiveAuth.isFromHistory && (
	                  <div className="mb-4">
	                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Authorization Period</div>
	                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
	                        <input
	                          type="date"
	                          value={draft.Auth_Start_Date || ""}
	                          onChange={(e) => setDraft((p) => ({ ...p, Auth_Start_Date: e.target.value }))}
	                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	                        />
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
	                        <input
	                          type="date"
	                          value={draft.Auth_End_Date || ""}
	                          onChange={(e) => setDraft((p) => ({ ...p, Auth_End_Date: e.target.value }))}
	                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	                        />
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
	                        <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium">
	                          {authDurationDisplay}
	                        </div>
	                      </div>
	                    </div>
	                  </div>
	                )}

	                {/* Row 2: Unit Allocation - show editable fields only for legacy mode */}
	                {!effectiveAuth.isFromHistory && (
	                  <div className="mb-4">
	                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Unit Allocation</div>
	                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">
	                          Base Units/Week
	                          {effectiveUnitsPerWeek !== baseUnitsPerWeek && (
	                            <span className="ml-1 text-purple-600">(Current: {effectiveUnitsPerWeek})</span>
	                          )}
	                        </label>
	                        <input
	                          type="number"
	                          min="0"
	                          step="0.5"
	                          value={draft.Units_Per_Week || ""}
	                          onChange={(e) => setDraft((p) => ({ ...p, Units_Per_Week: e.target.value }))}
	                          placeholder="e.g., 10"
	                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	                        />
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Total Authorized</label>
	                        <input
	                          type="number"
	                          min="0"
	                          step="0.5"
	                          value={draft.Authorized_Units || ""}
	                          onChange={(e) => setDraft((p) => ({ ...p, Authorized_Units: e.target.value }))}
	                          placeholder="e.g., 80"
	                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	                        />
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Adjusted Total</label>
	                        <div className={`px-3 py-2 rounded-lg font-medium ${totalUnitAdjustments !== 0 ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-white border border-gray-200 text-gray-700"}`}>
	                          {adjustedTotal > 0 ? adjustedTotal.toFixed(1) : "—"}
	                          {totalUnitAdjustments !== 0 && <span className="text-xs ml-1">({totalUnitAdjustments > 0 ? "+" : ""}{totalUnitAdjustments})</span>}
	                        </div>
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Units Required</label>
	                        <div className={`px-3 py-2 rounded-lg font-medium ${hasShortage ? "bg-red-100 text-red-800 border border-red-300" : "bg-white border border-gray-200 text-gray-700"}`}>
	                          {unitsRequired > 0 ? unitsRequired.toFixed(1) : "—"}
	                        </div>
	                      </div>
	                    </div>
	                  </div>
	                )}

	                {/* Unit Summary (always visible) */}
	                {effectiveAuth.isFromHistory && (
	                  <div className="mb-4">
	                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Unit Summary</div>
	                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">
	                          Units/Week
	                          {effectiveUnitsPerWeek !== baseUnitsPerWeek && (
	                            <span className="ml-1 text-purple-600">(Current: {effectiveUnitsPerWeek})</span>
	                          )}
	                        </label>
	                        <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium">
	                          {baseUnitsPerWeek || "—"}
	                        </div>
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Adjusted Total</label>
	                        <div className={`px-3 py-2 rounded-lg font-medium ${totalUnitAdjustments !== 0 ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-white border border-gray-200 text-gray-700"}`}>
	                          {adjustedTotal > 0 ? adjustedTotal.toFixed(1) : "—"}
	                          {totalUnitAdjustments !== 0 && <span className="text-xs ml-1">({totalUnitAdjustments > 0 ? "+" : ""}{totalUnitAdjustments})</span>}
	                        </div>
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Units Required</label>
	                        <div className={`px-3 py-2 rounded-lg font-medium ${hasShortage ? "bg-red-100 text-red-800 border border-red-300" : "bg-white border border-gray-200 text-gray-700"}`}>
	                          {unitsRequired > 0 ? unitsRequired.toFixed(1) : "—"}
	                        </div>
	                      </div>
	                      <div>
	                        <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
	                        <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium">
	                          {authDurationDisplay}
	                        </div>
	                      </div>
	                    </div>
	                  </div>
	                )}

	                {/* Row 3: Unit Adjustments (Legacy mode only) */}
	                {!effectiveAuth.isFromHistory && (
	                <div className="mb-4">
	                  <div className="flex items-center justify-between mb-2">
	                    <div className="text-xs font-semibold text-gray-500 uppercase">Adjustments</div>
	                    <div className="flex gap-2">
	                      <button
	                        type="button"
	                        onClick={() => {
	                          const newAdj = {
	                            id: Date.now().toString(),
	                            type: "rate_increase",
	                            amount: "",
	                            effective_date: new Date().toISOString().split("T")[0],
	                            note: ""
	                          };
	                          setDraft((p) => ({
	                            ...p,
	                            Unit_Adjustments: [...(p.Unit_Adjustments || []), newAdj]
	                          }));
	                        }}
	                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
	                      >
	                        <LucideIcon name="TrendingUp" className="w-3 h-3" />
	                        Rate Change
	                      </button>
	                      <button
	                        type="button"
	                        onClick={() => {
	                          const newAdj = {
	                            id: Date.now().toString(),
	                            type: "units_increase",
	                            amount: "",
	                            effective_date: new Date().toISOString().split("T")[0],
	                            note: ""
	                          };
	                          setDraft((p) => ({
	                            ...p,
	                            Unit_Adjustments: [...(p.Unit_Adjustments || []), newAdj]
	                          }));
	                        }}
	                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
	                      >
	                        <LucideIcon name="Plus" className="w-3 h-3" />
	                        Unit Adjustment
	                      </button>
	                    </div>
	                  </div>
	                  {Array.isArray(draft.Unit_Adjustments) && draft.Unit_Adjustments.length > 0 ? (
	                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
	                      <table className="w-full text-sm">
	                        <thead>
	                          <tr className="bg-gray-50 border-b border-gray-200">
	                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Date</th>
	                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Type</th>
	                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Amount</th>
	                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Note</th>
	                            <th className="w-10"></th>
	                          </tr>
	                        </thead>
	                        <tbody>
	                          {draft.Unit_Adjustments.map((adj, idx) => (
	                            <tr key={adj.id || idx} className="border-b border-gray-100 last:border-0">
	                              <td className="px-2 py-2">
	                                <input
	                                  type="date"
	                                  value={adj.effective_date || ""}
	                                  onChange={(e) => {
	                                    const updated = [...draft.Unit_Adjustments];
	                                    updated[idx] = { ...updated[idx], effective_date: e.target.value };
	                                    setDraft((p) => ({ ...p, Unit_Adjustments: updated }));
	                                  }}
	                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
	                                />
	                              </td>
	                              <td className="px-2 py-2">
	                                <select
	                                  value={adj.type || "units_increase"}
	                                  onChange={(e) => {
	                                    const updated = [...draft.Unit_Adjustments];
	                                    updated[idx] = { ...updated[idx], type: e.target.value };
	                                    setDraft((p) => ({ ...p, Unit_Adjustments: updated }));
	                                  }}
	                                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${
	                                    adj.type?.startsWith("rate") ? "border-purple-300 bg-purple-50" : "border-gray-300"
	                                  }`}
	                                >
	                                  <optgroup label="Rate (units/week)">
	                                    <option value="rate_increase">Rate +</option>
	                                    <option value="rate_decrease">Rate -</option>
	                                  </optgroup>
	                                  <optgroup label="Total Units">
	                                    <option value="units_increase">Units +</option>
	                                    <option value="units_decrease">Units -</option>
	                                  </optgroup>
	                                </select>
	                              </td>
	                              <td className="px-2 py-2">
	                                <input
	                                  type="number"
	                                  min="0"
	                                  step="0.5"
	                                  value={adj.amount || ""}
	                                  onChange={(e) => {
	                                    const updated = [...draft.Unit_Adjustments];
	                                    updated[idx] = { ...updated[idx], amount: e.target.value };
	                                    setDraft((p) => ({ ...p, Unit_Adjustments: updated }));
	                                  }}
	                                  placeholder="0"
	                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
	                                />
	                              </td>
	                              <td className="px-2 py-2">
	                                <input
	                                  type="text"
	                                  value={adj.note || ""}
	                                  onChange={(e) => {
	                                    const updated = [...draft.Unit_Adjustments];
	                                    updated[idx] = { ...updated[idx], note: e.target.value };
	                                    setDraft((p) => ({ ...p, Unit_Adjustments: updated }));
	                                  }}
	                                  placeholder="Optional note..."
	                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
	                                />
	                              </td>
	                              <td className="px-2 py-2">
	                                <button
	                                  type="button"
	                                  onClick={() => {
	                                    const updated = draft.Unit_Adjustments.filter((_, i) => i !== idx);
	                                    setDraft((p) => ({ ...p, Unit_Adjustments: updated }));
	                                  }}
	                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
	                                >
	                                  <LucideIcon name="Trash2" className="w-4 h-4" />
	                                </button>
	                              </td>
	                            </tr>
	                          ))}
	                        </tbody>
	                      </table>
	                    </div>
	                  ) : (
	                    <div className="text-sm text-gray-400 italic">No adjustments added</div>
	                  )}

	                  {/* Rate Schedule Display */}
	                  {rateSegments.length > 1 && (
	                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
	                      <div className="text-xs font-semibold text-purple-700 uppercase mb-2">Rate Schedule</div>
	                      <div className="space-y-1">
	                        {rateSegments.map((seg, idx) => (
	                          <div key={idx} className="flex items-center justify-between text-sm">
	                            <span className="text-gray-600">
	                              {seg.start.toLocaleDateString()} - {seg.end.toLocaleDateString()}
	                            </span>
	                            <span className="font-medium text-purple-800">
	                              {seg.rate} units/week × {seg.weeks.toFixed(1)} weeks = {(seg.rate * seg.weeks).toFixed(1)} units
	                            </span>
	                          </div>
	                        ))}
	                        <div className="flex items-center justify-between text-sm font-bold border-t border-purple-300 pt-1 mt-1">
	                          <span className="text-purple-700">Total Required</span>
	                          <span className="text-purple-900">{unitsRequired.toFixed(1)} units</span>
	                        </div>
	                      </div>
	                    </div>
	                  )}
	                </div>
	                )}

	                {/* Rate Schedule Display (when using history with adjustments) */}
	                {effectiveAuth.isFromHistory && rateSegments.length > 1 && (
	                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
	                    <div className="text-xs font-semibold text-purple-700 uppercase mb-2">Rate Schedule</div>
	                    <div className="space-y-1">
	                      {rateSegments.map((seg, idx) => (
	                        <div key={idx} className="flex items-center justify-between text-sm">
	                          <span className="text-gray-600">
	                            {seg.start.toLocaleDateString()} - {seg.end.toLocaleDateString()}
	                          </span>
	                          <span className="font-medium text-purple-800">
	                            {seg.rate} units/week × {seg.weeks.toFixed(1)} weeks = {(seg.rate * seg.weeks).toFixed(1)} units
	                          </span>
	                        </div>
	                      ))}
	                      <div className="flex items-center justify-between text-sm font-bold border-t border-purple-300 pt-1 mt-1">
	                        <span className="text-purple-700">Total Required</span>
	                        <span className="text-purple-900">{unitsRequired.toFixed(1)} units</span>
	                      </div>
	                    </div>
	                  </div>
	                )}

	                {/* Row 4: Usage & Balance */}
	                <div className="mb-4">
	                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Usage & Balance</div>
	                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
	                    <div>
	                      <label className="block text-xs font-semibold text-gray-600 mb-1">Units Used</label>
	                      <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium">
	                        {unitsUsed.hours > 0 && <span>{unitsUsed.hours} hrs</span>}
	                        {unitsUsed.hours > 0 && unitsUsed.occurrences > 0 && <span> + </span>}
	                        {unitsUsed.occurrences > 0 && <span>{unitsUsed.occurrences} tests</span>}
	                        {unitsUsed.hours === 0 && unitsUsed.occurrences === 0 && <span className="text-gray-400">0</span>}
	                      </div>
	                    </div>
	                    <div>
	                      <label className="block text-xs font-semibold text-gray-600 mb-1">Balance</label>
	                      <div className={`px-3 py-2 rounded-lg font-bold ${
	                        adjustedTotal === 0
	                          ? "bg-gray-100 text-gray-500"
	                          : unitsBalance <= 0
	                            ? "bg-red-100 text-red-700 border border-red-300"
	                            : isRunningLow
	                              ? "bg-amber-100 text-amber-700 border border-amber-300"
	                              : "bg-green-100 text-green-700 border border-green-300"
	                      }`}>
	                        {adjustedTotal === 0 ? "—" : `${unitsBalance.toFixed(1)} units`}
	                      </div>
	                    </div>
	                    <div>
	                      <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
	                      <div className={`px-3 py-2 rounded-lg font-medium text-sm ${
	                        daysUntilExpiry !== null && daysUntilExpiry <= 0
	                          ? "bg-red-100 text-red-700 border border-red-300"
	                          : daysUntilExpiry !== null && daysUntilExpiry <= 14
	                            ? "bg-amber-100 text-amber-700 border border-amber-300"
	                            : "bg-green-100 text-green-700 border border-green-300"
	                      }`}>
	                        {daysUntilExpiry === null ? "—" : daysUntilExpiry <= 0 ? "Expired" : `${daysUntilExpiry} days left`}
	                      </div>
	                    </div>
	                  </div>
	                </div>

	                {/* Alert Banners */}
	                {hasShortage && (
	                  <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 font-medium flex items-start gap-2">
	                    <LucideIcon name="AlertTriangle" className="w-5 h-5 flex-shrink-0 mt-0.5" />
	                    <div>
	                      <div className="font-bold">Insufficient Units for Authorization Period</div>
	                      <div>
	                        Need {unitsRequired.toFixed(1)} units
	                        {rateSegments.length > 1 ? " (see rate schedule above)" : ` (${effectiveUnitsPerWeek}/week × ${authDurationWeeks.toFixed(1)} weeks)`}
	                        {" "}but only {adjustedTotal.toFixed(1)} authorized. Short by {unitsShortage.toFixed(1)} units.
	                      </div>
	                    </div>
	                  </div>
	                )}
	                {daysUntilExpiry !== null && daysUntilExpiry <= 14 && daysUntilExpiry > 0 && (
	                  <div className={`mt-3 p-3 rounded-lg text-sm font-medium flex items-start gap-2 ${daysUntilExpiry <= 7 ? "bg-red-50 border border-red-300 text-red-700" : "bg-amber-50 border border-amber-300 text-amber-700"}`}>
	                    <LucideIcon name="Clock" className="w-5 h-5 flex-shrink-0 mt-0.5" />
	                    <div>
	                      <div className="font-bold">{daysUntilExpiry <= 7 ? "URGENT: " : ""}Authorization Expiring Soon</div>
	                      <div>This authorization expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""} ({effectiveAuth.endDate}).</div>
	                    </div>
	                  </div>
	                )}
	                {isRunningLow && unitsBalance > 0 && (
	                  <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-700 font-medium flex items-start gap-2">
	                    <LucideIcon name="AlertCircle" className="w-5 h-5 flex-shrink-0 mt-0.5" />
	                    <div>
	                      <div className="font-bold">Low Unit Balance</div>
	                      <div>Only {unitsBalance.toFixed(1)} units remaining ({weeksOfUnitsLeft?.toFixed(1)} weeks at {effectiveUnitsPerWeek}/week).</div>
	                    </div>
	                  </div>
	                )}
	                {adjustedTotal > 0 && unitsBalance <= 0 && (
	                  <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 font-medium flex items-start gap-2">
	                    <LucideIcon name="AlertTriangle" className="w-5 h-5 flex-shrink-0 mt-0.5" />
	                    <div>
	                      <div className="font-bold">Units Exhausted</div>
	                      <div>All authorized units have been used. Balance: {unitsBalance.toFixed(1)}</div>
	                    </div>
	                  </div>
	                )}

	                {/* Authorization History Section */}
	                <div className="mt-4 pt-4 border-t border-blue-200">
	                  <div className="flex items-center justify-between mb-3">
	                    <div className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
	                      <LucideIcon name="History" className="w-4 h-4" />
	                      Authorization History
	                      {Array.isArray(draft.Authorization_History) && draft.Authorization_History.length > 0 && (
	                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
	                          {draft.Authorization_History.length} authorization{draft.Authorization_History.length !== 1 ? "s" : ""}
	                        </span>
	                      )}
	                    </div>
	                    <button
	                      type="button"
	                      onClick={() => {
	                        setEditingAuthId(null);
	                        setShowAuthHistoryModal(true);
	                      }}
	                      className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
	                    >
	                      <LucideIcon name="Plus" className="w-3 h-3" />
	                      Add Authorization
	                    </button>
	                  </div>

	                  {Array.isArray(draft.Authorization_History) && draft.Authorization_History.length > 0 ? (
	                    <div className="space-y-2">
	                      {[...draft.Authorization_History]
	                        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
	                        .map((auth) => {
	                          const isActive = activeAuthorization?.id === auth.id;
	                          const today = new Date();
	                          today.setHours(0, 0, 0, 0);
	                          const startDate = new Date(auth.start_date);
	                          const endDate = new Date(auth.end_date);
	                          const isFuture = startDate > today;
	                          const isPast = endDate < today;

	                          const statusLabel = isActive ? "Active" : isFuture ? "Upcoming" : isPast ? "Expired" : "—";
	                          const statusClass = isActive
	                            ? "bg-green-100 text-green-700 border-green-300"
	                            : isFuture
	                              ? "bg-blue-100 text-blue-700 border-blue-300"
	                              : "bg-gray-100 text-gray-500 border-gray-300";

	                          // Service type badge colors
	                          const serviceTypeBadge = (() => {
	                            const svc = auth.service_type || "";
	                            if (svc.startsWith("PTSV")) return { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" };
	                            if (svc.startsWith("IHFS") || svc.startsWith("OHFS")) return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" };
	                            if (svc.startsWith("DST")) return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" };
	                            return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300" };
	                          })();

	                          return (
	                            <div
	                              key={auth.id}
	                              className={`p-3 rounded-lg border ${isActive ? "bg-green-50 border-green-300" : "bg-white border-gray-200"} flex items-center justify-between`}
	                            >
	                              <div className="flex-1">
	                                <div className="flex items-center gap-2 flex-wrap">
	                                  <span className={`text-xs px-2 py-0.5 rounded border ${statusClass} font-medium`}>
	                                    {statusLabel}
	                                  </span>
	                                  {auth.service_type && (
	                                    <span className={`text-xs px-2 py-0.5 rounded border ${serviceTypeBadge.bg} ${serviceTypeBadge.text} ${serviceTypeBadge.border} font-medium`}>
	                                      {auth.service_type}
	                                    </span>
	                                  )}
	                                  <span className="text-sm font-medium text-gray-800">
	                                    {auth.start_date} to {auth.end_date}
	                                  </span>
	                                </div>
	                                <div className="text-xs text-gray-500 mt-1">
	                                  {auth.units_per_week} units/week • {auth.total_units} total units
	                                  {Array.isArray(auth.adjustments) && auth.adjustments.length > 0 && (
	                                    <span className="ml-2 text-purple-600">
	                                      ({auth.adjustments.length} adjustment{auth.adjustments.length !== 1 ? "s" : ""})
	                                    </span>
	                                  )}
	                                  {auth.notes && <span className="ml-2 italic text-gray-400">"{auth.notes}"</span>}
	                                </div>
	                              </div>
	                              <div className="flex items-center gap-1">
	                                <button
	                                  type="button"
	                                  onClick={() => {
	                                    setEditingAuthId(auth.id);
	                                    setShowAuthHistoryModal(true);
	                                  }}
	                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
	                                  title="Edit authorization"
	                                >
	                                  <LucideIcon name="Pencil" className="w-4 h-4" />
	                                </button>
	                                <button
	                                  type="button"
	                                  onClick={() => {
	                                    if (confirm("Delete this authorization? This cannot be undone.")) {
	                                      setDraft((p) => ({
	                                        ...p,
	                                        Authorization_History: p.Authorization_History.filter((a) => a.id !== auth.id)
	                                      }));
	                                    }
	                                  }}
	                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
	                                  title="Delete authorization"
	                                >
	                                  <LucideIcon name="Trash2" className="w-4 h-4" />
	                                </button>
	                              </div>
	                            </div>
	                          );
	                        })}
	                    </div>
	                  ) : (
	                    <div className="text-sm text-gray-400 italic py-2">
	                      No authorization history. Add authorizations to track multiple auth periods.
	                    </div>
	                  )}

	                  {/* Migrate current auth to history button */}
	                  {draft.Auth_Start_Date && draft.Auth_End_Date && draft.Authorization_History?.length === 0 && (
	                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
	                      <div className="flex items-center justify-between">
	                        <div className="text-sm text-amber-700">
	                          <span className="font-medium">Migrate current authorization to history?</span>
	                          <div className="text-xs mt-0.5">
	                            This will move your current auth ({draft.Auth_Start_Date} to {draft.Auth_End_Date}) into the history system.
	                          </div>
	                        </div>
	                        <button
	                          type="button"
	                          onClick={() => {
	                            const newAuth = {
	                              id: Date.now().toString(),
	                              start_date: draft.Auth_Start_Date,
	                              end_date: draft.Auth_End_Date,
	                              units_per_week: draft.Units_Per_Week || "",
	                              total_units: draft.Authorized_Units || "",
	                              adjustments: Array.isArray(draft.Unit_Adjustments) ? [...draft.Unit_Adjustments] : [],
	                              created_at: new Date().toISOString(),
	                              notes: "Migrated from legacy fields"
	                            };
	                            setDraft((p) => ({
	                              ...p,
	                              Authorization_History: [...(p.Authorization_History || []), newAuth],
	                              // Clear legacy fields after migration
	                              Auth_Start_Date: "",
	                              Auth_End_Date: "",
	                              Units_Per_Week: "",
	                              Authorized_Units: "",
	                              Unit_Adjustments: []
	                            }));
	                          }}
	                          className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-1"
	                        >
	                          <LucideIcon name="ArrowRight" className="w-3 h-3" />
	                          Migrate
	                        </button>
	                      </div>
	                    </div>
	                  )}
	                </div>
	              </div>
	            </div>

	            {/* Authorization History Modal */}
	            {showAuthHistoryModal && (
	              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
	                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
	                  <div className="p-6 border-b border-gray-200">
	                    <div className="flex items-center justify-between">
	                      <h2 className="text-xl font-bold text-gray-900">
	                        {editingAuthId ? "Edit Authorization" : "Add New Authorization"}
	                      </h2>
	                      <button
	                        type="button"
	                        onClick={() => setShowAuthHistoryModal(false)}
	                        className="p-2 hover:bg-gray-100 rounded-lg"
	                      >
	                        <LucideIcon name="X" className="w-5 h-5" />
	                      </button>
	                    </div>
	                  </div>
	                  <div className="p-6">
	                    <AuthorizationForm
	                      existingAuth={editingAuthId ? draft.Authorization_History?.find((a) => a.id === editingAuthId) : null}
	                      onSave={(authData) => {
	                        if (editingAuthId) {
	                          // Update existing
	                          setDraft((p) => ({
	                            ...p,
	                            Authorization_History: p.Authorization_History.map((a) =>
	                              a.id === editingAuthId ? { ...a, ...authData } : a
	                            )
	                          }));
	                        } else {
	                          // Add new
	                          const newAuth = {
	                            id: Date.now().toString(),
	                            ...authData,
	                            created_at: new Date().toISOString()
	                          };
	                          setDraft((p) => ({
	                            ...p,
	                            Authorization_History: [...(p.Authorization_History || []), newAuth]
	                          }));
	                        }
	                        setShowAuthHistoryModal(false);
	                        setEditingAuthId(null);
	                      }}
	                      onCancel={() => {
	                        setShowAuthHistoryModal(false);
	                        setEditingAuthId(null);
	                      }}
	                    />
	                  </div>
	                </div>
	              </div>
	            )}

	            {/* Parents Section */}
	            <div className="mb-8">
	              <div className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Parents / Adults</div>
	              <div className="overflow-x-auto">
	                <table className="w-full border-collapse">
	                  <thead>
	                    <tr className="bg-slate-100">
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-16">#</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200">Name</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-32">Gender</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-36">Relationship</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-32">Age Range</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-16">HoH</th>
	                    </tr>
	                  </thead>
	                  <tbody>
	                    {[1, 2, 3].map((n) => (
	                      <tr key={n} className="bg-white hover:bg-slate-50">
	                        <td className="px-4 py-3 border border-slate-200 text-center font-medium text-gray-500">{n}</td>
	                        <td className="px-2 py-2 border border-slate-200">
	                          <input
	                            value={draft[`Parent_${n}`] || ""}
	                            onChange={(e) => setDraft((p) => ({ ...p, [`Parent_${n}`]: e.target.value }))}
	                            className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                            placeholder={`Parent ${n} name...`}
	                          />
	                        </td>
	                        <td className="px-2 py-2 border border-slate-200">
	                          <select
	                            value={draft[`Parent_${n}_Gender`] || ""}
	                            onChange={(e) => setDraft((p) => ({ ...p, [`Parent_${n}_Gender`]: e.target.value }))}
	                            className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                          >
	                            <option value="">-- Select --</option>
	                            {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
	                          </select>
	                        </td>
	                        <td className="px-2 py-2 border border-slate-200">
	                          <select
	                            value={draft[`Parent_${n}_Relationship`] || ""}
	                            onChange={(e) => setDraft((p) => ({ ...p, [`Parent_${n}_Relationship`]: e.target.value }))}
	                            className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                          >
	                            <option value="">-- Select --</option>
	                            {PARENT_RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
	                          </select>
	                        </td>
	                        <td className="px-2 py-2 border border-slate-200">
	                          <select
	                            value={draft[`Parent_${n}_Age_Range`] || ""}
	                            onChange={(e) => setDraft((p) => ({ ...p, [`Parent_${n}_Age_Range`]: e.target.value }))}
	                            className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                          >
	                            <option value="">-- Select --</option>
	                            {PARENT_AGE_RANGE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
	                          </select>
	                        </td>
	                        <td className="px-2 py-2 border border-slate-200 text-center">
	                          <input
	                            type="radio"
	                            name="head_of_household"
	                            checked={draft.Head_of_Household === String(n)}
	                            onChange={() => setDraft((p) => ({ ...p, Head_of_Household: String(n) }))}
	                            className="w-4 h-4 text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
	                          />
	                        </td>
	                      </tr>
	                    ))}
	                  </tbody>
	                </table>
	              </div>
	            </div>

	            {/* Children Section */}
	            <div className="mb-8">
	              <div className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Children</div>
	              <div className="overflow-x-auto">
	                <table className="w-full border-collapse">
	                  <thead>
	                    <tr className="bg-slate-100">
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-16">#</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200">Name</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-36">Gender</th>
	                      <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 border border-slate-200 w-36">Age Range</th>
	                    </tr>
	                  </thead>
	                  <tbody>
	                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
	                      <tr key={n} className="bg-white hover:bg-slate-50">
	                        <td className="px-4 py-3 border border-slate-200 text-center font-medium text-gray-500">{n}</td>
	                        <td className="px-2 py-2 border border-slate-200">
	                          <input
	                            value={draft[`Child_${n}`] || ""}
	                            onChange={(e) => setDraft((p) => ({ ...p, [`Child_${n}`]: e.target.value }))}
	                            className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                            placeholder={`Child ${n} name...`}
	                          />
	                        </td>
	                        <td className="px-2 py-2 border border-slate-200">
	                          <select
	                            value={draft[`Child_${n}_Gender`] || ""}
	                            onChange={(e) => setDraft((p) => ({ ...p, [`Child_${n}_Gender`]: e.target.value }))}
	                            className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                          >
	                            <option value="">-- Select --</option>
	                            {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
	                          </select>
	                        </td>
	                        <td className="px-2 py-2 border border-slate-200">
	                          <select
	                            value={draft[`Child_${n}_Age_Range`] || ""}
	                            onChange={(e) => setDraft((p) => ({ ...p, [`Child_${n}_Age_Range`]: e.target.value }))}
	                            className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                          >
	                            <option value="">-- Select --</option>
	                            {AGE_RANGE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
	                          </select>
	                        </td>
	                      </tr>
	                    ))}
	                  </tbody>
	                </table>
	              </div>
	            </div>

	            {/* Goals Section */}
	            <div>
	              <div className="flex items-center justify-between mb-4">
	                <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">Goals (up to 6)</div>
	                <Button
	                  variant="secondary"
	                  className="text-sm rounded-lg px-4 h-9"
	                  iconName="Plus"
	                  disabled={(goalsList || []).filter((g) => String(g || "").trim()).length >= 6}
	                  onClick={() => {
	                    setGoalsList((prev) => {
	                      const next = Array.isArray(prev) ? [...prev] : [];
	                      if (next.length >= 6) return next;
	                      next.push("");
	                      syncGoalsTextFromList(next);
	                      return next;
	                    });
	                  }}
	                >
	                  Add Goal
	                </Button>
	              </div>
	              <div className="space-y-3">
	                {(goalsList && goalsList.length ? goalsList : [""]).slice(0, 6).map((g, idx) => (
	                  <div key={idx} className="flex items-center gap-3">
	                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
	                      {idx + 1}
	                    </div>
	                    <input
	                      value={g}
	                      onChange={(e) => {
	                        const value = e.target.value;
	                        setGoalsList((prev) => {
	                          const next = Array.isArray(prev) ? [...prev] : [];
	                          next[idx] = value;
	                          syncGoalsTextFromList(next);
	                          return next;
	                        });
	                      }}
	                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-gray-900 bg-white"
	                      placeholder={`Goal ${idx + 1}...`}
	                    />
	                    <Button
	                      variant="danger"
	                      className="text-sm px-3 h-9 flex-shrink-0"
	                      iconName="Trash2"
	                      disabled={(goalsList || []).length <= 1}
	                      onClick={() => {
	                        setGoalsList((prev) => {
	                          const next = (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx);
	                          const ensured = next.length ? next : [""];
	                          syncGoalsTextFromList(ensured);
	                          return ensured;
	                        });
	                      }}
	                      title="Remove goal"
	                    />
	                  </div>
	                ))}
	              </div>
	              <div className="mt-3 text-xs text-gray-500">
	                These goals populate the Case Note goals checklist.
	              </div>
	            </div>

	            {/* Discharge / Archive Section */}
	            {selectedProfileKey && !draft.is_archived && (
	              <div className="mb-8 p-5 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl">
	                <div className="flex items-center justify-between">
	                  <div>
	                    <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">Case Discharge</div>
	                    <div className="text-xs text-gray-500 mt-1">Archive this profile when services are complete</div>
	                  </div>
	                  <button
	                    type="button"
	                    onClick={() => setShowDischargeModal(true)}
	                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm font-medium"
	                  >
	                    <LucideIcon name="Archive" className="w-4 h-4" />
	                    Discharge & Archive
	                  </button>
	                </div>
	              </div>
	            )}

	            {/* Discharge Modal */}
	            {showDischargeModal && (
	              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
	                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
	                  <div className="p-6 border-b border-gray-200">
	                    <div className="flex items-center justify-between">
	                      <h3 className="text-lg font-bold text-gray-900">Discharge & Archive Profile</h3>
	                      <button
	                        type="button"
	                        onClick={() => setShowDischargeModal(false)}
	                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
	                      >
	                        <LucideIcon name="X" className="w-5 h-5" />
	                      </button>
	                    </div>
	                    <p className="text-sm text-gray-500 mt-2">
	                      Archiving will move this profile to the archived section. You can restore it later if needed.
	                    </p>
	                  </div>
	                  <div className="p-6 space-y-4">
	                    <div>
	                      <label className="block text-sm font-semibold text-gray-700 mb-2">Discharge Reason *</label>
	                      <select
	                        value={draft.discharge_status || ""}
	                        onChange={(e) => setDraft(p => ({ ...p, discharge_status: e.target.value }))}
	                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	                      >
	                        {DISCHARGE_STATUS_OPTIONS.map(opt => (
	                          <option key={opt.value} value={opt.value}>{opt.label}</option>
	                        ))}
	                      </select>
	                    </div>
	                    <div>
	                      <label className="block text-sm font-semibold text-gray-700 mb-2">Discharge Date *</label>
	                      <input
	                        type="date"
	                        value={draft.discharge_date || ""}
	                        onChange={(e) => setDraft(p => ({ ...p, discharge_date: e.target.value }))}
	                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	                      />
	                    </div>
	                    <div>
	                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
	                      <textarea
	                        value={draft.discharge_notes || ""}
	                        onChange={(e) => setDraft(p => ({ ...p, discharge_notes: e.target.value }))}
	                        rows={3}
	                        placeholder="Any additional notes about the discharge..."
	                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	                      />
	                    </div>

	                    {/* Discharge status color preview */}
	                    {draft.discharge_status && (
	                      <div className={`p-3 rounded-lg ${
	                        draft.discharge_status === "successful" ? "bg-green-50 border border-green-200" :
	                        draft.discharge_status === "unsuccessful" ? "bg-red-50 border border-red-200" :
	                        draft.discharge_status === "terminated_violence" ? "bg-red-100 border border-red-300" :
	                        "bg-gray-50 border border-gray-200"
	                      }`}>
	                        <div className="text-sm font-medium flex items-center gap-2">
	                          <LucideIcon name={
	                            draft.discharge_status === "successful" ? "CheckCircle" :
	                            draft.discharge_status === "unsuccessful" ? "XCircle" :
	                            draft.discharge_status === "terminated_violence" ? "AlertTriangle" :
	                            "Archive"
	                          } className="w-4 h-4" />
	                          {getDischargeLabel(draft.discharge_status)}
	                        </div>
	                      </div>
	                    )}
	                  </div>
	                  <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
	                    <button
	                      type="button"
	                      onClick={() => setShowDischargeModal(false)}
	                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
	                    >
	                      Cancel
	                    </button>
	                    <button
	                      type="button"
	                      disabled={!draft.discharge_status || !draft.discharge_date}
	                      onClick={async () => {
	                        if (!draft.discharge_status || !draft.discharge_date) {
	                          alert("Please select a discharge reason and date.");
	                          return;
	                        }
	                        setSaving(true);
	                        try {
	                          const payload = {
	                            ...draft,
	                            is_archived: true,
	                            goalsText: (goalsList || []).map((g) => String(g || "").trim()).filter(Boolean).slice(0, 6).join("\n")
	                          };
	                          await onSaveProfile(payload, selectedProfileKey);
	                          setShowDischargeModal(false);
	                          onToast("Profile archived successfully.");
	                          if (typeof onAfterSave === "function") onAfterSave();
	                        } catch (err) {
	                          alert(String(err?.message || err));
	                        } finally {
	                          setSaving(false);
	                        }
	                      }}
	                      className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
	                        !draft.discharge_status || !draft.discharge_date
	                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
	                          : "bg-gray-700 text-white hover:bg-gray-800"
	                      }`}
	                    >
	                      <LucideIcon name="Archive" className="w-4 h-4" />
	                      Archive Profile
	                    </button>
	                  </div>
	                </div>
	              </div>
	            )}
	          </div>
	        );
	      }

      // --- Main Application ---
      // Keep in sync with ADMIN_EMAILS env var used server-side in api/createUser.js
      const ADMIN_EMAILS = ["bhinrichs1380@gmail.com"];
      const ALLOWED_DOMAIN = "epworthfamilyresources.org";
      const ALLOWED_EMAILS = [
        "raquelfm.dean@gmail.com",
        "mburgessefr@gmail.com",
        "lrobinsonefr@gmail.com",
      ];

      const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
      const isAllowedEmail = (email) => {
        const normalized = normalizeEmail(email);
        if (!normalized) return false;
        if (ADMIN_EMAILS.map(normalizeEmail).includes(normalized)) return true;
        if (ALLOWED_EMAILS.map(normalizeEmail).includes(normalized)) return true;
        return normalized.endsWith(`@${ALLOWED_DOMAIN}`);
      };
      const isGoogleAccount = (user) =>
        Array.isArray(user?.providerData) && user.providerData.some((p) => p?.providerId === "google.com");

      // Direct audit logging for auth events (before component refs are ready)
      const logAuthEvent = async (action, userEmail, userId, details = {}) => {
        try {
          if (!db) return;
          const hour = new Date().getHours();
          const oddHours = hour < 7 || hour >= 21;
          const severity = action === "unauthorized_access" || action === "failed_login" ? "critical" : "low";

          await db.collection("artifacts").doc("case-note-app-v1").collection("audit_logs").add({
            action,
            category: "security",
            severity,
            user_email: userEmail || "unknown",
            user_id: userId || "unknown",
            odd_hours: oddHours,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            details: {
              ...details,
              timestamp_local: new Date().toISOString(),
              user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            },
          });
        } catch (err) {
          console.warn("Failed to log auth event:", err);
        }
      };

		      function App() {
	        const [user, setUser] = useState(null);
	        const [activeTab, setActiveTab] = useState("form");
	        const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	        const [entries, setEntries] = useState([]);

	        // Check if current user is an admin
	        const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
          const allowedTabs = isAdmin ? null : new Set(["form", "table", "contacts"]);

          useEffect(() => {
            if (!isAdmin && !allowedTabs?.has(activeTab)) {
              setActiveTab("form");
            }
          }, [isAdmin, activeTab]);

          // Track previous tab for change logging
          const prevTabRef = React.useRef(activeTab);
          useEffect(() => {
            if (prevTabRef.current !== activeTab && user) {
              // Log view change (uses direct Firebase write since logAuditEvent may not be ready)
              const logViewChange = async () => {
                try {
                  if (!db) return;
                  const hour = new Date().getHours();
                  const oddHours = hour < 7 || hour >= 21;
                  await db.collection("artifacts").doc("case-note-app-v1").collection("audit_logs").add({
                    action: "view_changed",
                    category: "system",
                    severity: "low",
                    user_email: user?.email || "unknown",
                    user_id: user?.uid || "unknown",
                    odd_hours: oddHours,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    details: {
                      from_view: prevTabRef.current,
                      to_view: activeTab,
                      is_admin: isAdmin,
                      timestamp_local: new Date().toISOString(),
                    },
                  });
                } catch (err) {
                  console.warn("Failed to log view change:", err);
                }
              };
              logViewChange();
            }
            prevTabRef.current = activeTab;
          }, [activeTab, user, isAdmin]);

	        // Worker names management - load from localStorage or use defaults
	        const [workerNames, setWorkerNames] = useState(() => {
	          try {
	            const saved = localStorage.getItem("case_note_workers");
	            if (saved) {
	              const parsed = JSON.parse(saved);
	              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
	            }
	          } catch {}
	          return DEFAULT_WORKER_NAMES;
	        });

	        // Save workers to localStorage when changed
	        useEffect(() => {
	          try {
	            localStorage.setItem("case_note_workers", JSON.stringify(workerNames));
	          } catch {}
	        }, [workerNames]);

	        const addWorker = (name) => {
	          const trimmed = String(name || "").trim();
	          if (!trimmed || workerNames.includes(trimmed)) return false;
	          setWorkerNames(prev => [...prev, trimmed]);
	          return true;
	        };

	        const removeWorker = (name) => {
	          setWorkerNames(prev => prev.filter(w => w !== name));
	        };

	        // Make WORKER_NAMES available for the form (dynamic)
	        const WORKER_NAMES = workerNames;
        const [referralGoals, setReferralGoals] = useState([]);
        const [caseDirectory, setCaseDirectory] = useState([]);
        const [savedLocations, setSavedLocations] = useState([]);
	        const [loadingEntries, setLoadingEntries] = useState(true);
	        const [loadingDirectory, setLoadingDirectory] = useState(true);
	        const [entriesLimit, setEntriesLimit] = useState(APP_CONSTANTS.ENTRIES_LIMIT_DEFAULT);
	        const [hasMoreEntries, setHasMoreEntries] = useState(true);
		        const [submitting, setSubmitting] = useState(false);
		        const submitGuardRef = useRef(null);
		        const lastDraftRef = useRef(null);
		        const [editingEntryId, setEditingEntryId] = useState("");
		        const [previewNote, setPreviewNote] = useState(null);
		        const [formResetNonce, setFormResetNonce] = useState(0);
		        const [profilesResetNonce, setProfilesResetNonce] = useState(0);
	        const [formData, setFormData] = useState({});
	        const [filterText, setFilterText] = useState("");
	        const [historyClientKey, setHistoryClientKey] = useState("");
	        const [historyDateStart, setHistoryDateStart] = useState("");
	        const [historyDateEnd, setHistoryDateEnd] = useState("");
	        const [historyServiceFilter, setHistoryServiceFilter] = useState("");
	        const [selectedEntryIds, setSelectedEntryIds] = useState({});
	        const [printHtml, setPrintHtml] = useState("");
	        const [authReady, setAuthReady] = useState(false);
	        const [authError, setAuthError] = useState("");
	        // Email/password login state (disabled)
        const lastAutofillKeyRef = useRef("");
        const autofillDebounceRef = useRef(null);
        const goalsDebounceRef = useRef(null);
	        const [importSummary, setImportSummary] = useState(null);
	        const [pastedCsv, setPastedCsv] = useState("");
	        const [pastedProfileText, setPastedProfileText] = useState("");
	        const [aiProfileSeed, setAiProfileSeed] = useState(null);
	        const [importInProgress, setImportInProgress] = useState(false);
        const [importMode, setImportMode] = useState("overwrite"); // "overwrite" | "fill-missing"
        const [importStatus, setImportStatus] = useState("");
        // Admin panel state
        const [adminEditingProfile, setAdminEditingProfile] = useState(null);
        const [adminProfileDraft, setAdminProfileDraft] = useState({});
        const [adminGoalsDraft, setAdminGoalsDraft] = useState([]);
        const [selectedProfileKey, setSelectedProfileKey] = useState("");
        const [historyMode, setHistoryMode] = useState("entries"); // "entries" | "profiles"
        const [adminSubTab, setAdminSubTab] = useState("overview"); // "overview" | "clients" | "data"
        const [adminExpandedSections, setAdminExpandedSections] = useState({});
        // Reports state
        const [reportMonth, setReportMonth] = useState(new Date().getMonth());
        const [reportYear, setReportYear] = useState(new Date().getFullYear());
        const [reportFamilyFilter, setReportFamilyFilter] = useState(""); // "" = all families
        const [aiReportType, setAiReportType] = useState("monthly-summary"); // AI report type selector
        const [aiReportLoading, setAiReportLoading] = useState(false);
        // AI Case Analysis state
        const [caseAnalysisFamily, setCaseAnalysisFamily] = useState("");
        const [caseAnalysisLoading, setCaseAnalysisLoading] = useState(false);
        const [caseAnalysisResult, setCaseAnalysisResult] = useState("");
        const [labResultLoading, setLabResultLoading] = useState(false);
        // Bulk Edit state (hoisted to parent to survive re-renders)
        const [bulkStartDate, setBulkStartDate] = useState("");
        const [bulkEndDate, setBulkEndDate] = useState("");
        const [bulkClientKey, setBulkClientKey] = useState("");
        const [bulkExpandedWorkers, setBulkExpandedWorkers] = useState({});
        const [bulkEditingEntryId, setBulkEditingEntryId] = useState(null);
        const [bulkEditFormData, setBulkEditFormData] = useState({});
        const [bulkSaving, setBulkSaving] = useState(false);
        const [bulkStatus, setBulkStatus] = useState("");
        const bulkAutoSaveTimeoutRef = useRef(null);
        // Non-Billable Contacts state
        const [nonBillableContacts, setNonBillableContacts] = useState([]);
        const [loadingContacts, setLoadingContacts] = useState(true);

        // Audit Log state
        const [auditLogs, setAuditLogs] = useState([]);
        const [loadingAuditLogs, setLoadingAuditLogs] = useState(true);
        const [auditLogFilter, setAuditLogFilter] = useState("all"); // all, entries, profiles, contacts, users
        const [contactFormData, setContactFormData] = useState({
          date: new Date().toISOString().split("T")[0],
          time: "",
          worker_name: "",
          worker_credential: "",
          family_name: "",
          narrative: "",
          contacted_parties: []
        });
        const [editingContactId, setEditingContactId] = useState("");
        const CONTACT_PARTIES = ["Attorney", "Case Worker", "Guardian Ad Litem", "CASA", "Therapist", "School", "Other HHS Staff"];

        // Monthly Reports tab state
        const [reportFormType, setReportFormType] = useState("family_support"); // family_support | ptsv | drug_testing
        const [reportFormClient, setReportFormClient] = useState("");
        const [reportFormMonth, setReportFormMonth] = useState(new Date().getMonth());
        const [reportFormYear, setReportFormYear] = useState(new Date().getFullYear());
        const [reportFormData, setReportFormData] = useState({});
        const [reportSessionLog, setReportSessionLog] = useState([]);
        const [reportAutoPopulating, setReportAutoPopulating] = useState(false);
        const [reportAiGenerating, setReportAiGenerating] = useState(false);
        const reportAutoKeyRef = useRef("");
		        // Auto-syncing from the project CSV can be slow and is optional; paste import is the primary path.
		        const [autoSyncCsvEnabled, setAutoSyncCsvEnabled] = useState(false);
		        const autoSyncAttemptedRef = useRef(false);
	        const [saveError, setSaveError] = useState("");
	        const [saveWarning, setSaveWarning] = useState("");
	        const [saveToast, setSaveToast] = useState("");
	        const PROFILE_CACHE_KEY = "case_note_profile_cache_v1";
	        const PROFILE_CACHE_VERSION = 1;
	        const ENTRIES_CACHE_KEY = "case_note_entries_cache_v1";
	        const ENTRIES_CACHE_VERSION = 1;
	        const GOALS_CACHE_KEY = "case_note_goals_cache_v1";
	        const GOALS_CACHE_VERSION = 1;

		        const showToast = (message) => {
		          setSaveToast(message);
		          window.clearTimeout(showToast._t);
		          showToast._t = window.setTimeout(() => setSaveToast(""), 2000);
		        };

		        const resetForNewEntry = () => {
		          setEditingEntryId("");
		          setPreviewNote(null);
		          lastDraftRef.current = null;
		          setFormData({});
		          setFormResetNonce((n) => n + 1);
		        };

	        const resetForNewProfile = () => {
	          setSelectedProfileKey("");
	          setPastedCsv("");
	          setPastedProfileText("");
	          setAiProfileSeed(null);
	          setProfilesResetNonce((n) => n + 1);
	        };

	        const parseProfileWithAI = async (text, hint = {}) => {
	          const inputText = String(text || "").trim();
	          if (!inputText) {
	            showToast("Paste box is empty.");
	            return null;
	          }
	          try {
	            setImportInProgress(true);
	            setImportStatus("AI parsing…");
	            const resp = await authFetch("/api/parseProfile", {
	              method: "POST",
	              headers: { "Content-Type": "application/json" },
	              body: JSON.stringify({ text: inputText, hint }),
	            });
	            const data = await resp.json().catch(() => ({}));
	            if (!resp.ok) throw new Error(data?.error || `AI parse failed (${resp.status})`);
	            return data;
	          } finally {
	            setImportInProgress(false);
	            setImportStatus("");
	          }
	        };

	        const [aiCaseNoteText, setAiCaseNoteText] = useState("");
	        const [parsingCaseNote, setParsingCaseNote] = useState(false);
	        const [aiParseError, setAiParseError] = useState("");

	        const parseCaseNoteWithAI = async (text, hint = {}) => {
	          const inputText = String(text || "").trim();
	          if (!inputText) {
	            showToast("Paste box is empty.");
	            return null;
	          }

	          // Create abort controller for timeout
	          const controller = new AbortController();
	          const timeoutId = setTimeout(() => controller.abort(), APP_CONSTANTS.AI_PARSE_TIMEOUT_MS);

	          try {
	            setParsingCaseNote(true);
	            setAiParseError("");

	            const resp = await authFetch("/api/parseCaseNote", {
	              method: "POST",
	              headers: { "Content-Type": "application/json" },
	              body: JSON.stringify({ text: inputText, hint }),
	              signal: controller.signal,
	            });

	            clearTimeout(timeoutId);

	            const data = await resp.json().catch(() => ({}));
	            if (!resp.ok) throw new Error(data?.error || `AI parse failed (${resp.status})`);
	            return data;
	          } catch (err) {
	            const errorMsg = err.name === "AbortError"
	              ? `AI parsing timed out after ${APP_CONSTANTS.AI_PARSE_TIMEOUT_MS / 1000}s. Please try again.`
	              : `AI parse error: ${err?.message || err}`;
	            setAiParseError(errorMsg);
	            showToast(errorMsg);
	            return null;
	          } finally {
	            clearTimeout(timeoutId);
	            setParsingCaseNote(false);
	          }
	        };

	        const applyCaseNoteParse = async () => {
	          // Collect all available goals from profiles to help AI match them
	          const allAvailableGoals = activeFamilyDirectoryOptions.flatMap((profile) => {
	            const goals = profile.goals || [];
	            return goals.map((goalText, idx) => ({
	              key: `goal_${profile.key}_${idx}`,
	              text: goalText,
	              profileKey: profile.key,
	              caseName: profile.caseName,
	              mcNumber: profile.mcNumber,
	            }));
	          });

	          // Pass available goals to AI for better matching
	          const hint = {
	            availableGoals: allAvailableGoals.map((g) => g.text),
	          };

	          const parsed = await parseCaseNoteWithAI(aiCaseNoteText, hint);
	          if (!parsed) return;

	          // IMPORTANT: Reset form to start a NEW entry - don't merge with existing entry
	          // This prevents AI parsing from overwriting an entry that's being edited
	          setEditingEntryId("");

	          // Build the form data from parsed fields (start fresh, don't merge with prev)
	          const updates = {};
	          if (parsed.service_type) updates.service_type = parsed.service_type;
	          if (parsed.contact_type) updates.contact_type = parsed.contact_type;
	          if (parsed.date) updates.date = parsed.date;
	          if (parsed.start_time) updates.start_time = parsed.start_time;
	          if (parsed.end_time) updates.end_time = parsed.end_time;
	          if (parsed.family_name) updates.family_name = parsed.family_name;
	          if (parsed.master_case) updates.master_case = parsed.master_case;
	          if (parsed.location) updates.location = parsed.location;
	          if (parsed.participants) updates.participants = parsed.participants;
	          if (parsed.visit_narrative) updates.visit_narrative = parsed.visit_narrative;
	          if (parsed.safety_assessment) updates.safety_assessment = parsed.safety_assessment;
	          if (parsed.interventions) updates.interventions = parsed.interventions;
	          if (parsed.plan) updates.plan = parsed.plan;
	          if (parsed.interactions) updates.interactions = parsed.interactions;
	          if (parsed.parenting_skills) updates.parenting_skills = parsed.parenting_skills;
	          if (parsed.specimen_collected) updates.specimen_collected = parsed.specimen_collected;
	          if (parsed.chain_of_custody) updates.chain_of_custody = parsed.chain_of_custody;
	          if (parsed.client_admission) updates.client_admission = parsed.client_admission;
	          if (parsed.engagement) updates.engagement = parsed.engagement;
	          if (parsed.cancellation_notification) updates.cancellation_notification = parsed.cancellation_notification;
	          if (parsed.cancellation_service_prep) updates.cancellation_service_prep = parsed.cancellation_service_prep;
	          if (parsed.cancellation_pre_call) updates.cancellation_pre_call = parsed.cancellation_pre_call;
	          if (parsed.cancellation_en_route) updates.cancellation_en_route = parsed.cancellation_en_route;
	          if (parsed.weather_explanation) updates.weather_explanation = parsed.weather_explanation;

	          // Try to match parsed family_name or master_case to an existing profile
	          // This ensures the entry gets properly linked via family_directory_key
	          const parsedName = normalize(parsed.family_name).toLowerCase();
	          const parsedCase = normalize(parsed.master_case);
	          let matchedProfile = null;

	          // First try to match by master case number (most reliable)
	          if (parsedCase) {
	            matchedProfile = activeFamilyDirectoryOptions.find((o) => normalize(o.mcNumber) === parsedCase);
	          }
	          // Then try to match by family name (case-insensitive)
	          if (!matchedProfile && parsedName) {
	            matchedProfile = activeFamilyDirectoryOptions.find((o) => normalize(o.caseName).toLowerCase() === parsedName);
	          }

	          if (matchedProfile) {
	            updates.family_directory_key = matchedProfile.key;
	            updates.family_id = matchedProfile.familyId || matchedProfile.key;
	            // Use the profile's exact values to ensure consistency
	            if (matchedProfile.caseName) updates.family_name = matchedProfile.caseName;
	            if (matchedProfile.mcNumber) updates.master_case = matchedProfile.mcNumber;
	          }

	          // Handle goals_addressed - map to form's goals structure
	          if (parsed.goals_addressed && Array.isArray(parsed.goals_addressed) && parsed.goals_addressed.length > 0) {
	            const goalsSelected = {};
	            const goalsAddressed = {};
	            const goalsRatings = {};
	            const goalsNextSteps = {};

	            // Get the profile's goals for matching
	            const profileGoals = matchedProfile?.goals || [];

	            parsed.goals_addressed.forEach((parsedGoal) => {
	              const goalText = String(parsedGoal.goal || "").trim();
	              if (!goalText) return;

	              // Try to find a matching goal in the profile
	              let matchedGoalKey = null;
	              let matchedGoalIdx = -1;

	              // First, try exact match
	              matchedGoalIdx = profileGoals.findIndex((g) =>
	                normalize(g).toLowerCase() === normalize(goalText).toLowerCase()
	              );

	              // If no exact match, try partial/fuzzy match
	              if (matchedGoalIdx === -1) {
	                const goalWords = goalText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
	                matchedGoalIdx = profileGoals.findIndex((g) => {
	                  const profileGoalLower = normalize(g).toLowerCase();
	                  // Check if most goal words appear in the profile goal
	                  const matchCount = goalWords.filter((w) => profileGoalLower.includes(w)).length;
	                  return matchCount >= Math.ceil(goalWords.length * 0.5); // At least 50% of words match
	                });
	              }

	              if (matchedGoalIdx !== -1 && matchedProfile) {
	                // Found a matching goal in the profile
	                matchedGoalKey = `goal_${matchedProfile.key}_${matchedGoalIdx}`;
	              } else {
	                // No match found - use a generated key based on the goal text
	                matchedGoalKey = `goal_parsed_${goalText.slice(0, 20).replace(/[^a-z0-9]/gi, "_")}`;
	              }

	              // Map the rating to form format
	              let rating = parsedGoal.rating || "N/A";
	              // Normalize rating values
	              const ratingMap = {
	                "significant": "Significant",
	                "moderate": "Moderate",
	                "poor": "Poor",
	                "none": "None",
	                "n/a": "N/A",
	                "na": "N/A",
	              };
	              rating = ratingMap[rating.toLowerCase()] || rating;

	              goalsSelected[matchedGoalKey] = true;
	              goalsAddressed[matchedGoalKey] = parsedGoal.response || "";
	              goalsRatings[matchedGoalKey] = rating;
	              goalsNextSteps[matchedGoalKey] = parsedGoal.next_steps || "";
	            });

	            updates.goals_selected = goalsSelected;
	            updates.goals_addressed = goalsAddressed;
	            updates.goals_ratings = goalsRatings;
	            updates.goals_next_steps = goalsNextSteps;

	            // Also create a text summary for goals_progress field
	            const goalsBlock = parsed.goals_addressed.map((g) => {
	              const parts = [`GOAL: ${g.goal || "Unknown"}`];
	              if (g.response) parts.push(`ADDRESSED: ${g.response}`);
	              if (g.rating) parts.push(`RATING: ${g.rating}`);
	              if (g.next_steps) parts.push(`NEXT STEPS: ${g.next_steps}`);
	              return parts.join("\n");
	            }).join("\n\n");
	            updates.goals_progress = goalsBlock;
	          }

	          // Replace form data entirely (don't merge with previous) to ensure clean new entry
	          setFormData(updates);
	          setAiCaseNoteText("");
	          setActiveTab("form"); // Switch to form tab to show the parsed data
	          const profileMsg = matchedProfile ? ` Linked to profile: ${matchedProfile.caseName}` : " No matching profile found - verify client selection.";
	          const goalsCount = parsed.goals_addressed?.length || 0;
	          const goalsMsg = goalsCount > 0 ? ` ${goalsCount} goal(s) auto-filled.` : "";
	          showToast(`AI parsed case note - NEW ENTRY created.${profileMsg}${goalsMsg} Review and adjust fields as needed.`);
	        };

	        useEffect(() => {
	          // Hydrate cached profiles immediately so the dropdown is instant.
	          try {
            const raw = localStorage.getItem(PROFILE_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.version !== PROFILE_CACHE_VERSION || !Array.isArray(parsed.caseDirectory)) return;
            if (parsed.caseDirectory.length) {
              setCaseDirectory(parsed.caseDirectory);
              setLoadingDirectory(false);
            }
          } catch {
            // ignore cache errors
	          }
	        }, []);

	        useEffect(() => {
	          // Hydrate cached history immediately so the History tab is instant.
	          try {
	            const raw = localStorage.getItem(ENTRIES_CACHE_KEY);
	            if (!raw) return;
	            const parsed = JSON.parse(raw);
	            if (!parsed || parsed.version !== ENTRIES_CACHE_VERSION || !Array.isArray(parsed.entries)) return;
	            if (parsed.entries.length) {
	              setEntries(parsed.entries);
	              setLoadingEntries(false);
	            }
	          } catch {
	            // ignore cache errors
	          }
	        }, []);

	        useEffect(() => {
	          // Hydrate cached goals immediately.
	          try {
	            const raw = localStorage.getItem(GOALS_CACHE_KEY);
	            if (!raw) return;
	            const parsed = JSON.parse(raw);
	            if (!parsed || parsed.version !== GOALS_CACHE_VERSION || !Array.isArray(parsed.goals)) return;
	            if (parsed.goals.length) {
	              setReferralGoals(parsed.goals);
	            }
	          } catch {
	            // ignore cache errors
	          }
	        }, []);

        const googleProvider = useMemo(() => {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          return provider;
        }, []);

        // Shared entries - all authenticated users see the same case notes
        const entriesRef = useMemo(() => {
          if (!db) return null;
          return db
            .collection("artifacts")
            .doc(appId)
            .collection("contract_entries");
        }, []);

        // Shared (app-wide) directory + goals so imports persist even if the auth user changes.
        const sharedGoalsRef = useMemo(() => {
          if (!db) return null;
          return db.collection("artifacts").doc(appId).collection("referral_goals");
        }, []);

        const sharedCaseDirectoryRef = useMemo(() => {
          if (!db) return null;
          return db.collection("artifacts").doc(appId).collection("case_directory");
        }, []);

        // Per-user directory/goals (fallback if Firestore rules don't allow shared writes).
        const userGoalsRef = useMemo(() => {
          if (!db || !user) return null;
          return db.collection("artifacts").doc(appId).collection("users").doc(user.uid).collection("referral_goals");
        }, [user]);

        const userCaseDirectoryRef = useMemo(() => {
          if (!db || !user) return null;
          return db.collection("artifacts").doc(appId).collection("users").doc(user.uid).collection("case_directory");
        }, [user]);

        const goalsRef = sharedGoalsRef || userGoalsRef;
        const caseDirectoryRef = sharedCaseDirectoryRef || userCaseDirectoryRef;

        // Shared locations - all users see the same saved locations
        const savedLocationsRef = useMemo(() => {
          if (!db) return null;
          return db
            .collection("artifacts")
            .doc(appId)
            .collection("saved_locations");
        }, []);

        // Non-billable contacts - shared across all users
        const nonBillableContactsRef = useMemo(() => {
          if (!db) return null;
          return db
            .collection("artifacts")
            .doc(appId)
            .collection("non_billable_contacts");
        }, []);

        // Audit logs - track all system actions
        const auditLogsRef = useMemo(() => {
          if (!db) return null;
          return db
            .collection("artifacts")
            .doc(appId)
            .collection("audit_logs");
        }, []);

        const splitGoalsToArray = (text) => {
          const lines = String(text || "")
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          return lines.slice(0, 6);
        };

	        // Generate a unique ID for new profiles (timestamp + random suffix)
	        const generateUniqueId = () => {
	          const timestamp = Date.now().toString(36);
	          const randomPart = Math.random().toString(36).substring(2, 8);
	          return `profile_${timestamp}_${randomPart}`;
	        };

	        const upsertClientProfile = async (profile, existingDocId = null) => {
	          if (!caseDirectoryRef || !goalsRef) return;
	          const nowServer = firebase.firestore.FieldValue.serverTimestamp();

          const caseName = normalize(profile.Case_Name);
          const mcNumber = normalize(profile.MC_Number);
          const goalsText = normalize(profile.goalsText);

          if (!caseName) throw new Error("Client profile needs a Case Name / Family Name.");

          // Always generate a unique Family ID for new profiles
          // For existing profiles (edits), use the existing document ID
          // This ensures every profile is unique, even with the same MC number
          let docId = existingDocId;
          let familyId = normalize(profile.Family_ID);

          if (!docId) {
            // New profile - always generate a unique ID
            docId = generateUniqueId();
            familyId = docId; // Set the Family_ID to match the generated doc ID
          } else {
            // Editing existing profile - keep the existing ID
            familyId = familyId || docId;
          }

          const goalLines = splitGoalsToArray(goalsText);
          const goalPayload = {
            ...(goalLines[0] ? { Goal_1: goalLines[0] } : {}),
            ...(goalLines[1] ? { Goal_2: goalLines[1] } : {}),
            ...(goalLines[2] ? { Goal_3: goalLines[2] } : {}),
            ...(goalLines[3] ? { Goal_4: goalLines[3] } : {}),
            ...(goalLines[4] ? { Goal_5: goalLines[4] } : {}),
            ...(goalLines[5] ? { Goal_6: goalLines[5] } : {}),
          };

          const profileDoc = {
            Family_ID: familyId || null,
            Case_Name: caseName || null,
            MC_Number: mcNumber || null,
            CFSS: normalize(profile.CFSS) || null,
            Typical_Location: normalize(profile.Typical_Location) || null,
            Poverty_Level: normalize(profile.Poverty_Level) || null,
            Household_Type: normalize(profile.Household_Type) || null,
            Authorized_Units: parseFloat(profile.Authorized_Units) || null,
            Units_Per_Week: parseFloat(profile.Units_Per_Week) || null,
            Auth_Start_Date: normalize(profile.Auth_Start_Date) || null,
            Auth_End_Date: normalize(profile.Auth_End_Date) || null,
            Unit_Adjustments: Array.isArray(profile.Unit_Adjustments) ? profile.Unit_Adjustments : [],
            Parent_1: normalize(profile.Parent_1) || null,
            Parent_1_Gender: normalize(profile.Parent_1_Gender) || null,
            Parent_2: normalize(profile.Parent_2) || null,
            Parent_2_Gender: normalize(profile.Parent_2_Gender) || null,
            Parent_3: normalize(profile.Parent_3) || null,
            Parent_3_Gender: normalize(profile.Parent_3_Gender) || null,
            Parent_1_Relationship: normalize(profile.Parent_1_Relationship) || null,
            Parent_1_Age_Range: normalize(profile.Parent_1_Age_Range) || null,
            Parent_2_Relationship: normalize(profile.Parent_2_Relationship) || null,
            Parent_2_Age_Range: normalize(profile.Parent_2_Age_Range) || null,
            Parent_3_Relationship: normalize(profile.Parent_3_Relationship) || null,
            Parent_3_Age_Range: normalize(profile.Parent_3_Age_Range) || null,
            Head_of_Household: normalize(profile.Head_of_Household) || null,
            Child_1: normalize(profile.Child_1) || null,
            Child_1_Gender: normalize(profile.Child_1_Gender) || null,
            Child_1_Age_Range: normalize(profile.Child_1_Age_Range) || null,
            Child_2: normalize(profile.Child_2) || null,
            Child_2_Gender: normalize(profile.Child_2_Gender) || null,
            Child_2_Age_Range: normalize(profile.Child_2_Age_Range) || null,
            Child_3: normalize(profile.Child_3) || null,
            Child_3_Gender: normalize(profile.Child_3_Gender) || null,
            Child_3_Age_Range: normalize(profile.Child_3_Age_Range) || null,
            Child_4: normalize(profile.Child_4) || null,
            Child_4_Gender: normalize(profile.Child_4_Gender) || null,
            Child_4_Age_Range: normalize(profile.Child_4_Age_Range) || null,
            Child_5: normalize(profile.Child_5) || null,
            Child_5_Gender: normalize(profile.Child_5_Gender) || null,
            Child_5_Age_Range: normalize(profile.Child_5_Age_Range) || null,
            Child_6: normalize(profile.Child_6) || null,
            Child_6_Gender: normalize(profile.Child_6_Gender) || null,
            Child_6_Age_Range: normalize(profile.Child_6_Age_Range) || null,
            Child_7: normalize(profile.Child_7) || null,
            Child_7_Gender: normalize(profile.Child_7_Gender) || null,
            Child_7_Age_Range: normalize(profile.Child_7_Age_Range) || null,
            goalsText: goalsText || null,
            // Service tracking dates
            Service_Start_Date: normalize(profile.Service_Start_Date) || null,
            Service_End_Date: normalize(profile.Service_End_Date) || null,
            // Lead case and linked cases
            is_lead_case: profile.is_lead_case === true,
            lead_case_id: normalize(profile.lead_case_id) || null,
            linked_case_ids: Array.isArray(profile.linked_case_ids) ? profile.linked_case_ids : [],
            ...goalPayload,
            updatedAt: nowServer,
            createdAt: nowServer,
          };

          const goalsDoc = {
            caseNumber: mcNumber || familyId || docId,
            familyName: caseName,
            goalsText: goalsText || null,
            updatedAt: nowServer,
            createdAt: nowServer,
          };

          const tryWrite = async (directoryRef, goalsRefToUse) => {
            if (!directoryRef || !goalsRefToUse) throw new Error("Database not ready.");
            await directoryRef.doc(docId).set(profileDoc, { merge: true });
            await goalsRefToUse.doc(docId).set(goalsDoc, { merge: true });
          };

          try {
            await tryWrite(sharedCaseDirectoryRef, sharedGoalsRef);
          } catch (err) {
            const message = String(err?.message || err);
            console.warn("Shared profile write failed, falling back to user-scoped:", message);
            await tryWrite(userCaseDirectoryRef, userGoalsRef);
          }

          // Log audit event for profile save
          await logAuditEvent(
            existingDocId ? "updated" : "created",
            "profile",
            {
              profile_id: docId,
              case_name: caseName,
              mc_number: mcNumber,
            }
          );

	          return docId;
	        };

	        const deleteClientProfile = async (profileKey) => {
	          const key = normalize(profileKey);
	          if (!key) return;
	          if (!confirm(`Delete the profile for "${key}"?\n\nThis removes the profile (and its goals) from the directory.`)) return;

	          const tryDelete = async (directoryRef, goalsRefToUse) => {
	            if (!directoryRef || !goalsRefToUse) throw new Error("Database not ready.");
	            const batch = db.batch();
	            batch.delete(directoryRef.doc(key));
	            batch.delete(goalsRefToUse.doc(key));
	            await batch.commit();
	          };

	          try {
	            await tryDelete(sharedCaseDirectoryRef, sharedGoalsRef);
	          } catch (err) {
	            const message = String(err?.message || err);
	            console.warn("Shared profile delete failed, falling back to user-scoped:", message);
	            await tryDelete(userCaseDirectoryRef, userGoalsRef);
	          }

          // Log audit event for profile deletion
          const deletedProfile = caseDirectory.find(p => normalize(p.id) === key || normalize(p.Family_ID) === key);
          await logAuditEvent("deleted", "profile", {
            profile_id: key,
            case_name: deletedProfile?.Case_Name || key,
          });

	          // Clear any UI selections pointing at this profile.
	          setSelectedProfileKey((prev) => (normalize(prev) === key ? "" : prev));
	          setHistoryClientKey((prev) => (normalize(prev) === key ? "" : prev));
	          setFormData((prev) => {
	            const selected = normalize(prev?.family_directory_key || prev?.family_id);
	            if (selected !== key) return prev;
	            const next = { ...(prev || {}) };
	            next.family_directory_key = "";
	            next.family_id = "";
	            next.family_name = "";
	            next.master_case = "";
	            next.referral_goals = "";
	            next.goals_progress = "";
	            next.goals_selected = {};
	            next.goals_addressed = {};
	            next.goals_ratings = {};
	            next.goals_next_steps = {};
	            return next;
	          });

	          showToast("Profile deleted.");
	        };

        const upsertClientProfileFromEntry = async () => {
          const familyId = normalize(formData.family_id || formData.family_directory_key);
          const caseName = normalize(formData.family_name);
          const mcNumber = normalize(formData.master_case);
          const goalsText = normalize(formData.referral_goals);
          if (!caseName && !mcNumber && !familyId) return;
          await upsertClientProfile({
            id: familyId || mcNumber,
            Family_ID: familyId,
            Case_Name: caseName,
            MC_Number: mcNumber,
            CFSS: normalize(formData.cfss),
            Typical_Location: normalize(formData.typical_location || formData.location),
            goalsText,
          });
        };

        // Auth Effect
        useEffect(() => {
          if (!auth) return;
          setAuthError("");

          auth
            .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch((error) => {
              console.error("Auth persistence error:", error);
              setAuthError(error?.message || "Auth persistence error");
            })
            .finally(() => {
              auth.getRedirectResult().catch((error) => {
                // Ignore "missing initial state" errors in WebView environments
                if (error?.message?.includes("missing initial state")) return;
                console.error("Redirect result error:", error);
                setAuthError(error?.message || "Redirect sign-in error");
              });
            });

          const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (!u) {
              setUser(null);
              return;
            }

            const email = normalizeEmail(u.email);
            const isGoogle = isGoogleAccount(u);
            if (!isGoogle || !isAllowedEmail(email)) {
              // Log unauthorized access attempt
              await logAuthEvent("unauthorized_access", u.email, u.uid, {
                reason: !isGoogle ? "not_google_account" : "email_not_allowed",
                attempted_email: u.email,
                provider: u.providerData?.[0]?.providerId || "unknown",
              });

              setAuthError(
                "Access denied. Please sign in with an approved Epworth Google account."
              );
              try {
                await auth.signOut();
              } catch {}
              setUser(null);
              return;
            }

            // Log successful login
            await logAuthEvent("login", u.email, u.uid, {
              provider: "google.com",
              is_admin: ADMIN_EMAILS.map(normalizeEmail).includes(email),
            });

            setUser(u);
          });

          setAuthReady(true);
          return () => unsubscribe();
        }, []);

        // Detect Android WebView (user agent lacks "; wv" since we strip it,
        // but we can check for the Android app package or a custom flag)
        const isAndroidWebView = /Android/.test(navigator.userAgent) && /Version\/[\d.]+/.test(navigator.userAgent);

        const linkOrSignInWithGoogle = async () => {
          if (!auth) return;
          setAuthError("");
          try {
            if (isAndroidWebView) {
              // Use redirect in WebView — popup doesn't work
              if (auth.currentUser && auth.currentUser.isAnonymous) {
                await auth.currentUser.linkWithRedirect(googleProvider);
              } else {
                await auth.signInWithRedirect(googleProvider);
              }
            } else {
              // Use popup on desktop/mobile browsers
              if (auth.currentUser && auth.currentUser.isAnonymous) {
                await auth.currentUser.linkWithPopup(googleProvider);
              } else {
                await auth.signInWithPopup(googleProvider);
              }
            }
          } catch (error) {
            console.error("Google sign-in error:", error);
            setAuthError(error?.message || "Google sign-in error");
          }
        };

        // Keep these as aliases for any other references
        const linkOrSignInWithGooglePopup = linkOrSignInWithGoogle;
        const linkOrSignInWithGoogleRedirect = linkOrSignInWithGoogle;

        // Email/password sign-in disabled (Google-only access)

        const signOut = async () => {
          if (!auth) return;
          setAuthError("");
          try {
            // Log logout event before signing out
            if (user) {
              await logAuthEvent("logout", user.email, user.uid, {});
            }
            await auth.signOut();
          } catch (error) {
            console.error("Sign out error:", error);
            setAuthError(error?.message || "Sign out error");
          }
        };

        const chunkArray = (arr, size) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };

        const updateEntriesWorker = async (entryIds, newWorkerName) => {
          if (!entriesRef || !db) return;
          const ids = (entryIds || []).filter(Boolean);
          if (!ids.length) return;
          const batches = chunkArray(ids, 400);
          for (const batchIds of batches) {
            const batch = db.batch();
            batchIds.forEach((id) => {
              const ref = entriesRef.doc(id);
              batch.update(ref, {
                worker_name: newWorkerName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              });
            });
            await batch.commit();
          }
        };

        const BulkEditView = () => {
          // Use hoisted state from parent to survive re-renders
          const startDate = bulkStartDate;
          const setStartDate = setBulkStartDate;
          const endDate = bulkEndDate;
          const setEndDate = setBulkEndDate;
          const clientKey = bulkClientKey;
          const setClientKey = setBulkClientKey;
          const expandedWorkers = bulkExpandedWorkers;
          const setExpandedWorkers = setBulkExpandedWorkers;
          const saving = bulkSaving;
          const setSaving = setBulkSaving;
          const status = bulkStatus;
          const setStatus = setBulkStatus;
          const editingEntryId = bulkEditingEntryId;
          const setEditingEntryId = setBulkEditingEntryId;
          const editFormData = bulkEditFormData;
          const setEditFormData = setBulkEditFormData;
          const autoSaveTimeoutRef = bulkAutoSaveTimeoutRef;

          const parseDate = (value) => {
            if (!value) return null;
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
          };

          const inRange = (value, start, end) => {
            const d = parseDate(value);
            if (!d) return false;
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
          };

          const start = parseDate(startDate);
          const end = parseDate(endDate);

          const filteredEntries = entries
            .filter((e) => entryMatchesClient(e, clientKey))
            .filter((e) => !e.is_archived)
            .filter((e) => {
              if (!start && !end) return true;
              return inRange(e.date, start, end);
            })
            .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

          // Group entries by worker
          const groups = filteredEntries.reduce((acc, entry) => {
            const worker = normalize(entry.worker_name) || "Unassigned";
            if (!acc[worker]) acc[worker] = [];
            acc[worker].push(entry);
            return acc;
          }, {});

          const workerOptions = [...new Set(workerNames)].sort();

          const toggleWorker = (worker) => {
            setExpandedWorkers(prev => ({
              ...prev,
              [worker]: !prev[worker]
            }));
          };

          // Start inline editing
          const handleStartEdit = (entry) => {
            setEditingEntryId(entry.id);
            setEditFormData({
              family_name: entry.family_name || "",
              date: entry.date || "",
              service_type: entry.service_type || "",
              master_case: entry.master_case || "",
              worker_name: entry.worker_name || "",
              contact_type: entry.contact_type || "",
              start_time: entry.start_time || "",
              end_time: entry.end_time || "",
              location: entry.location || "",
              participants: entry.participants || "",
              visit_narrative: entry.visit_narrative || "",
              goals_progress: entry.goals_progress || "",
              interventions: entry.interventions || "",
              plan: entry.plan || "",
              interactions: entry.interactions || "",
              parenting_skills: entry.parenting_skills || "",
              safety_concern_present: entry.safety_concern_present || "No",
              safety_concern_description: entry.safety_concern_description || "",
              safety_concern_addressed: entry.safety_concern_addressed || "",
              // Sweat patch results fields
              sp_date_sent: entry.sp_date_sent || "",
              sp_test_result: entry.sp_test_result || "",
              sp_client_admitted_use: entry.sp_client_admitted_use || "",
              sp_non_admission_explanation: entry.sp_non_admission_explanation || "",
              sp_drugs_tested_positive: entry.sp_drugs_tested_positive || "",
              sp_other_drug_specify: entry.sp_other_drug_specify || "",
              sp_tampered_explanation: entry.sp_tampered_explanation || "",
              // Lab submission fields
              sent_to_lab: entry.sent_to_lab || "",
              not_sent_to_lab_reason: entry.not_sent_to_lab_reason || "",
              lab_result_text: entry.lab_result_text || "",
            });
          };

          // Auto-save when form data changes
          const handleFieldChange = (field, value) => {
            setEditFormData(prev => ({ ...prev, [field]: value }));

            // Clear existing timeout
            if (autoSaveTimeoutRef.current) {
              clearTimeout(autoSaveTimeoutRef.current);
            }

            // Set new auto-save timeout (save after 1 second of no changes)
            autoSaveTimeoutRef.current = setTimeout(() => {
              handleAutoSave(field, value);
            }, 1000);
          };

          const handleAutoSave = async (changedField, changedValue) => {
            if (!editingEntryId) return;
            try {
              setSaving(true);
              setStatus("Saving...");
              const updateData = { ...editFormData, [changedField]: changedValue, updatedAt: new Date() };
              await entriesRef.doc(editingEntryId).update(updateData);
              setStatus("Saved automatically");
              setTimeout(() => setStatus(""), 2000);
            } catch (err) {
              setStatus(`Save failed: ${err?.message || err}`);
            } finally {
              setSaving(false);
            }
          };

          // Handle lab result image upload and OCR extraction
          const handleLabImageUpload = async (file) => {
            if (!file) return;
            setLabResultLoading(true);
            try {
              const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const resp = await authFetch("/api/parseLabResult", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: base64 }),
              });
              const data = await resp.json();
              if (data.error) throw new Error(data.error);
              handleInputChange("lab_result_text", data.text || "");
              // Auto-set sent_to_lab to Yes when a lab screenshot is uploaded
              handleInputChange("sent_to_lab", "Yes");
            } catch (err) {
              alert("Failed to extract lab results: " + (err?.message || err));
            } finally {
              setLabResultLoading(false);
            }
          };

          // Close inline edit
          const handleCloseEdit = () => {
            if (autoSaveTimeoutRef.current) {
              clearTimeout(autoSaveTimeoutRef.current);
            }
            setEditingEntryId(null);
            setEditFormData({});
          };

          // Archive entry
          const handleArchiveEntry = async (entry) => {
            if (!confirm(`Archive this case note for "${entry.family_name || "Unknown"}"? It will be hidden from lists but can be restored.`)) return;
            try {
              setSaving(true);
              setStatus("Archiving...");
              await entriesRef.doc(entry.id).update({
                is_archived: true,
                archived_date: new Date().toISOString().split("T")[0],
                updatedAt: new Date()
              });
              setStatus("Entry archived");
              setTimeout(() => setStatus(""), 2000);
            } catch (err) {
              setStatus(`Archive failed: ${err?.message || err}`);
            } finally {
              setSaving(false);
            }
          };

          // Delete entry
          const handleDeleteEntry = async (entry) => {
            // Log delete attempt first
            await logAuditEvent("delete_attempt", "entry", {
              entry_id: entry.id,
              family_name: entry.family_name,
              service_type: entry.service_type,
              service_date: entry.date,
            });

            if (!confirm(`Permanently delete this case note for "${entry.family_name || "Unknown"}"? This cannot be undone.`)) return;
            try {
              setSaving(true);
              setStatus("Deleting...");
              await entriesRef.doc(entry.id).delete();

              // Log successful deletion
              await logAuditEvent("deleted", "entry", {
                entry_id: entry.id,
                family_name: entry.family_name,
                service_type: entry.service_type,
                service_date: entry.date,
              });

              setStatus("Entry deleted");
              setTimeout(() => setStatus(""), 2000);
            } catch (err) {
              setStatus(`Delete failed: ${err?.message || err}`);
            } finally {
              setSaving(false);
            }
          };

          return (
            <div className="w-full space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Bulk Edit</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Filter case notes by date range and client. Click a worker to expand their entries, then use the action buttons to edit, archive, or delete.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select
                      value={clientKey}
                      onChange={(e) => setClientKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">All Clients</option>
                      {activeFamilyDirectoryOptions.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.mcNumber ? `${o.caseName} (${o.mcNumber})` : o.caseName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  {filteredEntries.length} entries match your filters.
                </div>
                {status && (
                  <div className={`mt-3 text-sm ${status.includes("failed") ? "text-red-700 bg-red-50 border-red-200" : "text-green-700 bg-green-50 border-green-200"} border rounded-lg px-3 py-2 flex items-center gap-2`}>
                    {saving && <LucideIcon name="Loader2" className="w-4 h-4 animate-spin" />}
                    {status}
                  </div>
                )}
              </div>

              {/* Collapsible Worker Sections */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Staff</h3>
                {workerOptions.length === 0 ? (
                  <div className="text-sm text-gray-500">No workers found.</div>
                ) : (
                  <div className="space-y-2">
                    {workerOptions.map((worker) => {
                      const workerEntries = groups[worker] || [];
                      const isExpanded = expandedWorkers[worker];
                      const entryCount = workerEntries.length;

                      return (
                        <div key={worker} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Collapsible Header */}
                          <button
                            onClick={() => toggleWorker(worker)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <LucideIcon
                                name={isExpanded ? "ChevronDown" : "ChevronRight"}
                                className="w-5 h-5 text-gray-500"
                              />
                              <span className="font-semibold text-gray-900">{worker}</span>
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                {entryCount} {entryCount === 1 ? "entry" : "entries"}
                              </span>
                            </div>
                          </button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="border-t border-gray-200">
                              {/* Entry List */}
                              {entryCount === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">
                                  No entries for this worker in the selected date range.
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {workerEntries.map((entry) => (
                                    <div key={entry.id} className="px-4 py-3">
                                      {editingEntryId === entry.id ? (
                                        /* Inline Edit Form - Narratives Only */
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                          {/* Header with entry info (read-only) */}
                                          <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                                            <div>
                                              <div className="font-semibold text-gray-800">{normalize(entry.family_name) || "Unknown Family"}</div>
                                              <div className="text-xs text-gray-500">
                                                {normalize(entry.date)} • {normalize(entry.service_type)} • {normalize(entry.contact_type)} • {normalize(entry.master_case) || "No Case #"}
                                              </div>
                                            </div>
                                            <button
                                              onClick={handleCloseEdit}
                                              className="text-blue-600 hover:text-blue-800 p-1"
                                              title="Close"
                                            >
                                              <LucideIcon name="X" className="w-5 h-5" />
                                            </button>
                                          </div>

                                          {/* Date & Time Fields */}
                                          <div className="grid grid-cols-3 gap-3">
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                                              <input
                                                type="date"
                                                value={editFormData.date || ""}
                                                onChange={(e) => handleFieldChange("date", e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                                              <input
                                                type="time"
                                                value={editFormData.start_time || ""}
                                                onChange={(e) => handleFieldChange("start_time", e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                                              <input
                                                type="time"
                                                value={editFormData.end_time || ""}
                                                onChange={(e) => handleFieldChange("end_time", e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              />
                                            </div>
                                          </div>

                                          {/* Narrative Fields - Based on Service Type */}
                                          <div className="space-y-3">
                                            {/* Session/Visit Narrative - Always shown */}
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-700 mb-1">Session/Visit Narrative</label>
                                              <textarea
                                                value={editFormData.visit_narrative}
                                                onChange={(e) => handleFieldChange("visit_narrative", e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Describe the session/visit..."
                                              />
                                            </div>

                                            {/* PTSV-specific fields: Interactions & Bonding, Parenting Skills */}
                                            {(entry.service_type === "PTSV" || entry.service_type === "PTSV-C") && (
                                              <>
                                                <div>
                                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Interactions & Bonding</label>
                                                  <textarea
                                                    value={editFormData.interactions}
                                                    onChange={(e) => handleFieldChange("interactions", e.target.value)}
                                                    rows={3}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Parent-child interactions observed..."
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parenting Skills Observed</label>
                                                  <textarea
                                                    value={editFormData.parenting_skills}
                                                    onChange={(e) => handleFieldChange("parenting_skills", e.target.value)}
                                                    rows={3}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Parenting skills observed..."
                                                  />
                                                </div>
                                              </>
                                            )}

                                            {/* Interventions/Activities - Always shown */}
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-700 mb-1">Interventions/Activities</label>
                                              <textarea
                                                value={editFormData.interventions}
                                                onChange={(e) => handleFieldChange("interventions", e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Interventions and activities used..."
                                              />
                                            </div>

                                            {/* Plan/Next Steps - Always shown */}
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-700 mb-1">Plan/Next Steps</label>
                                              <textarea
                                                value={editFormData.plan}
                                                onChange={(e) => handleFieldChange("plan", e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Plan and next steps..."
                                              />
                                            </div>

                                            {/* DST-SP Sweat Patch Results - inline edit */}
                                            {entry.service_type === "DST-SP" && (
                                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                                                <label className="block text-xs font-bold text-purple-800 uppercase">Sweat Patch Results</label>
                                                <div>
                                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Result</label>
                                                  <select
                                                    value={editFormData.sp_test_result || ""}
                                                    onChange={(e) => handleFieldChange("sp_test_result", e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                  >
                                                    <option value="">-- Select Result --</option>
                                                    <option value="Negative">Negative</option>
                                                    <option value="Positive">Positive</option>
                                                    <option value="Tampered">Tampered</option>
                                                  </select>
                                                </div>

                                                {editFormData.sp_test_result === "Positive" && (
                                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                                                    <div>
                                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Did client admit to using?</label>
                                                      <select
                                                        value={editFormData.sp_client_admitted_use || ""}
                                                        onChange={(e) => handleFieldChange("sp_client_admitted_use", e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                      >
                                                        <option value="">-- Select --</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                      </select>
                                                    </div>
                                                    {editFormData.sp_client_admitted_use === "No" && (
                                                      <div>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Non-admission explanation</label>
                                                        <textarea
                                                          value={editFormData.sp_non_admission_explanation || ""}
                                                          onChange={(e) => handleFieldChange("sp_non_admission_explanation", e.target.value)}
                                                          rows={2}
                                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                          placeholder="Why the client did not admit..."
                                                        />
                                                      </div>
                                                    )}
                                                    <div>
                                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Drugs tested positive for</label>
                                                      <input
                                                        type="text"
                                                        value={editFormData.sp_drugs_tested_positive || ""}
                                                        onChange={(e) => handleFieldChange("sp_drugs_tested_positive", e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                        placeholder="e.g. Marijuana (THC), Methamphetamine"
                                                      />
                                                    </div>
                                                  </div>
                                                )}

                                                {editFormData.sp_test_result === "Tampered" && (
                                                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                    <label className="block text-xs font-semibold text-orange-800 mb-1">Tampered circumstances (counts as positive)</label>
                                                    <textarea
                                                      value={editFormData.sp_tampered_explanation || ""}
                                                      onChange={(e) => handleFieldChange("sp_tampered_explanation", e.target.value)}
                                                      rows={2}
                                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                      placeholder="Document tampering circumstances..."
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          <div className="text-xs text-blue-600 flex items-center gap-1 pt-2 border-t border-blue-200">
                                            <LucideIcon name="Check" className="w-3 h-3" />
                                            Changes save automatically
                                          </div>
                                        </div>
                                      ) : (
                                        /* Normal Entry Display */
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-800">
                                              {normalize(entry.family_name) || "Unknown Family"}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                              {normalize(entry.date)} • {normalize(entry.service_type) || "No Service Type"} • {normalize(entry.master_case) || "No Case #"}
                                              {entry.service_type === "DST-SP" && (
                                                <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                                  entry.sp_test_result === "Negative" ? "bg-green-100 text-green-700" :
                                                  entry.sp_test_result === "Positive" ? "bg-red-100 text-red-700" :
                                                  entry.sp_test_result === "Tampered" ? "bg-orange-100 text-orange-700" :
                                                  "bg-purple-100 text-purple-700"
                                                }`}>
                                                  {entry.sp_test_result || "Results Pending"}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleStartEdit(entry)}
                                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                              title="Edit"
                                              disabled={saving}
                                            >
                                              <LucideIcon name="Edit2" className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleArchiveEntry(entry)}
                                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                              title="Archive"
                                              disabled={saving}
                                            >
                                              <LucideIcon name="Archive" className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteEntry(entry)}
                                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                              title="Delete"
                                              disabled={saving}
                                            >
                                              <LucideIcon name="Trash2" className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        };

        // Data Sync Effect
	        useEffect(() => {
	          if (!user || !db || !entriesRef || !savedLocationsRef) return;

	          // If we already have cached data, don't block the UI with loading spinners.
	          if (!entries.length) setLoadingEntries(true);
	          if (!caseDirectory.length) setLoadingDirectory(true);

          // Limit initial history load for speed; export can still fetch all on-demand.
	          const unsubEntries = entriesRef
	            .orderBy("createdAt", "desc")
	            .limit(entriesLimit)
	            .onSnapshot(
	            (snapshot) => {
	              const loadedEntries = snapshot.docs.map((d) => ({
	                id: d.id,
	                ...d.data(),
	              }));
	              setEntries(loadedEntries);
	              setLoadingEntries(false);
	              setHasMoreEntries(snapshot.docs.length >= entriesLimit);
	              try {
	                // Cache a lightweight copy for instant History on next load.
	                localStorage.setItem(
	                  ENTRIES_CACHE_KEY,
	                  JSON.stringify({ version: ENTRIES_CACHE_VERSION, entries: loadedEntries.slice(0, 50) })
	                );
	              } catch {
	                // ignore cache errors
	              }
	            },
	            (err) => console.error("[DataSync] Entries sync error:", err)
	          );

          // Merge shared + user-scoped goals/directory so data is visible regardless of where it was created.
          let sharedGoals = [];
          let userGoals = [];
          let sharedDirectory = [];
          let userDirectory = [];

          const mergeById = (primary, secondary) => {
            const map = new Map();
            secondary.forEach((d) => map.set(d.id, { ...d }));
            primary.forEach((d) => map.set(d.id, { ...(map.get(d.id) || {}), ...d }));
            return Array.from(map.values());
          };

          const maybeFinalizeDirectory = () => {
            const merged = mergeById(userDirectory, sharedDirectory);
            merged.sort((a, b) => String(a.MC_Number || a.caseNumber || a.id || "").localeCompare(String(b.MC_Number || b.caseNumber || b.id || "")));
            setCaseDirectory(merged);
            setLoadingDirectory(false);
            try {
              // Store a slim cache so next load is instant.
              const slim = merged.map((d) => ({
                id: d.id,
                Family_ID: d.Family_ID,
                Case_Name: d.Case_Name,
                MC_Number: d.MC_Number,
                CFSS: d.CFSS,
                Typical_Location: d.Typical_Location,
                last_location: d.last_location,
                locations: d.locations,
                Participants: d.Participants,
                Parent_1: d.Parent_1,
                Parent_2: d.Parent_2,
                Parent_3: d.Parent_3,
                Child_1: d.Child_1,
                Child_2: d.Child_2,
                Child_3: d.Child_3,
                Child_4: d.Child_4,
                Child_5: d.Child_5,
                Child_6: d.Child_6,
                Child_7: d.Child_7,
                goalsText: d.goalsText,
                Goal_1: d.Goal_1,
                Goal_2: d.Goal_2,
                Goal_3: d.Goal_3,
                Goal_4: d.Goal_4,
                Goal_5: d.Goal_5,
                Goal_6: d.Goal_6,
              }));
              localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ version: PROFILE_CACHE_VERSION, caseDirectory: slim }));
            } catch {
              // ignore quota/cache errors
            }
          };

          const maybeFinalizeGoals = () => {
            const merged = mergeById(userGoals, sharedGoals);
            setReferralGoals(merged);
            // Cache goals for instant load next time
            try {
              localStorage.setItem(GOALS_CACHE_KEY, JSON.stringify({ version: GOALS_CACHE_VERSION, goals: merged }));
            } catch {
              // ignore quota/cache errors
            }
          };

          const unsubs = [];
          const directoryQuery = (ref) => {
            if (!ref) return null;
            // Reduce payload to speed up initial load.
            if (typeof ref.select === "function") {
              return ref.select(
                "Family_ID",
                "Case_Name",
                "MC_Number",
                "CFSS",
                "Typical_Location",
                "last_location",
                "locations",
                "Participants",
                "Parent_1",
                "Parent_2",
                "Parent_3",
                "Child_1",
                "Child_2",
                "Child_3",
                "Child_4",
                "Child_5",
                "Child_6",
                "Child_7",
                "goalsText",
                "Goal_1",
                "Goal_2",
                "Goal_3",
                "Goal_4",
                "Goal_5",
                "Goal_6"
              );
            }
            return ref;
          };

          const goalsQuery = (ref) => {
            if (!ref) return null;
            if (typeof ref.select === "function") {
              return ref.select("caseNumber", "familyName", "goalsText");
            }
            return ref;
          };

          if (sharedGoalsRef) {
            unsubs.push(
              goalsQuery(sharedGoalsRef).onSnapshot(
                (snapshot) => {
                  sharedGoals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                  maybeFinalizeGoals();
                },
                (err) => console.error("Shared goals sync error:", err)
              )
            );
          }
          if (userGoalsRef) {
            unsubs.push(
              goalsQuery(userGoalsRef).onSnapshot(
                (snapshot) => {
                  userGoals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                  maybeFinalizeGoals();
                },
                (err) => console.error("User goals sync error:", err)
              )
            );
          }
          if (sharedCaseDirectoryRef) {
            unsubs.push(
              directoryQuery(sharedCaseDirectoryRef).onSnapshot(
                (snapshot) => {
                  sharedDirectory = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                  maybeFinalizeDirectory();
                },
                (err) => console.error("Shared directory sync error:", err)
              )
            );
          }
          if (userCaseDirectoryRef) {
            unsubs.push(
              directoryQuery(userCaseDirectoryRef).onSnapshot(
                (snapshot) => {
                  userDirectory = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                  maybeFinalizeDirectory();
                },
                (err) => console.error("User directory sync error:", err)
              )
            );
          }

          const unsubLocations = savedLocationsRef.onSnapshot(
            (snapshot) => {
              const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
              loaded.sort((a, b) => String(a.label || a.value || a.id).localeCompare(String(b.label || b.value || b.id)));
              setSavedLocations(loaded);
            },
            (err) => console.error("Locations sync error:", err)
          );

          // Load non-billable contacts
          const unsubContacts = nonBillableContactsRef ? nonBillableContactsRef
            .orderBy("date", "desc")
            .onSnapshot(
              (snapshot) => {
                const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setNonBillableContacts(loaded);
                setLoadingContacts(false);
              },
              (err) => {
                console.error("Non-billable contacts sync error:", err);
                setLoadingContacts(false);
              }
            ) : () => {};

          // Load audit logs
          const unsubAuditLogs = auditLogsRef ? auditLogsRef
            .orderBy("timestamp", "desc")
            .limit(500)
            .onSnapshot(
              (snapshot) => {
                const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setAuditLogs(loaded);
                setLoadingAuditLogs(false);
              },
              (err) => {
                console.error("Audit logs sync error:", err);
                setLoadingAuditLogs(false);
              }
            ) : () => {};

          return () => {
            unsubEntries();
            unsubs.forEach((u) => u && u());
            unsubLocations();
            unsubContacts();
            unsubAuditLogs();
          };
        }, [user, entriesRef, savedLocationsRef, nonBillableContactsRef, auditLogsRef, sharedGoalsRef, userGoalsRef, sharedCaseDirectoryRef, userCaseDirectoryRef, entriesLimit]);

        const handleInputChange = React.useCallback((colId, value) => {
          setFormData((prev) => ({ ...prev, [colId]: value }));
        }, []);

	        const normalize = (val) => String(val || "").trim();
	        const normalizeLower = (val) => normalize(val).toLowerCase();

        // Determine if current hour is outside normal business hours (7 AM - 9 PM)
        const isOddHours = () => {
          const hour = new Date().getHours();
          return hour < 7 || hour >= 21; // Before 7 AM or after 9 PM
        };

        // Determine severity level based on action type
        const getSeverityLevel = (action, category) => {
          // Critical: Security events, deletions
          if (action === "unauthorized_access" || action === "failed_login") return "critical";
          if (action === "deleted" && (category === "entry" || category === "profile")) return "high";
          if (action === "delete_attempt") return "high";
          // Medium: Modifications, view changes
          if (action === "updated" || action === "view_changed" || action === "bulk_edit") return "medium";
          // Low: Normal operations
          if (action === "created" || action === "login" || action === "logout") return "low";
          if (action === "exported" || action === "imported") return "medium";
          return "info";
        };

        // Log audit events to track system actions
        const logAuditEvent = async (action, category, details = {}) => {
          if (!auditLogsRef) return;
          try {
            const severity = getSeverityLevel(action, category);
            const oddHours = isOddHours();

            await auditLogsRef.add({
              action, // created, updated, deleted, imported, exported, login, logout, unauthorized_access, failed_login, view_changed, delete_attempt
              category, // entry, profile, contact, user, system, security
              severity, // critical, high, medium, low, info
              user_email: user?.email || "unknown",
              user_id: user?.uid || "unknown",
              odd_hours: oddHours,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              details: {
                ...details,
                timestamp_local: new Date().toISOString(),
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
              },
            });

            // Flag odd hours access for security review
            if (oddHours && severity !== "info") {
              console.warn(`[AUDIT] Odd hours ${severity} event: ${action} on ${category} by ${user?.email}`);
            }
          } catch (err) {
            console.warn("Failed to log audit event:", err);
          }
        };

	        const getEntryClientKey = (entry) => {
	          const key =
	            normalize(entry?.family_directory_key) ||
	            normalize(entry?.family_id) ||
	            normalize(entry?.master_case) ||
	            normalize(entry?.family_name);
	          return key;
	        };

	        const entryMatchesClient = (entry, clientKey) => {
	          const ck = normalize(clientKey);
	          if (!ck) return true;

	          // If entry has a family_directory_key, use it as the primary match (most reliable)
	          const entryDirKey = normalize(entry?.family_directory_key);
	          if (entryDirKey) {
	            // Direct match or backward compat (old entries stored familyId/mcNumber as key)
	            if (entryDirKey === ck) return true;
	            const profile = familyDirectoryOptions.find((o) => o.key === ck);
	            if (profile && (entryDirKey === profile.familyId || entryDirKey === profile.mcNumber)) return true;
	            return false;
	          }

	          // For entries without family_directory_key, try to match via profile fields
	          const profile = familyDirectoryOptions.find((o) => o.key === ck);
	          if (!profile) return false;

	          // Match by family_id if the profile has a familyId
	          const entryFamilyId = normalize(entry?.family_id);
	          if (entryFamilyId && normalize(profile.familyId) && entryFamilyId === normalize(profile.familyId)) {
	            return true;
	          }

	          // Match by master case number (exact match required)
	          const entryCase = normalize(entry?.master_case);
	          if (entryCase && normalize(profile.mcNumber) && entryCase === normalize(profile.mcNumber)) {
	            return true;
	          }

	          // Match by family name only if BOTH master_case matches OR entry has no master_case
	          // This prevents cross-matching between different families with similar names
	          const entryName = normalizeLower(entry?.family_name);
	          const profileName = normalizeLower(profile.caseName);
	          if (entryName && profileName && entryName === profileName) {
	            // If entry has a master_case but profile doesn't have mcNumber, allow match
	            // If entry has no master_case, allow match by name
	            // If both have case numbers, only match if they're the same
	            if (!entryCase || !normalize(profile.mcNumber)) {
	              return true;
	            }
	          }

	          return false;
	        };

        const getField = (obj, ...keys) => {
          for (const key of keys) {
            const value = obj?.[key];
            if (value !== undefined && value !== null && String(value).trim() !== "") return value;
          }
          return "";
        };

        const getFamilyId = (rec) => getField(rec, "Family_ID", "familyId", "family_id", "id");
        const getCaseName = (rec) => getField(rec, "Case_Name", "caseName", "familyName", "family_name");
        const getMasterCaseNumber = (rec) => getField(rec, "MC_Number", "caseNumber", "master_case");
        const getCFSS = (rec) => getField(rec, "CFSS", "cfss");
        const getTypicalLocation = (rec) => getField(rec, "last_location", "Last_Location", "Typical_Location", "typicalLocation", "typical_location", "location");
        const getParticipants = (rec) => getField(rec, "Participants", "participants");
        const getProfileLocations = (rec) => {
          const locations = [];
          const push = (v) => {
            const s = String(v || "").trim();
            if (!s) return;
            locations.push(s);
          };

          const list = rec?.locations || rec?.Locations || rec?.saved_locations || rec?.Saved_Locations;
          if (Array.isArray(list)) list.forEach(push);
          push(getField(rec, "last_location", "Last_Location"));
          push(getField(rec, "Typical_Location", "typical_location", "typicalLocation"));

          const seen = new Set();
          return locations.filter((l) => {
            const key = l.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        const getProfileParticipantList = (rec) => {
          const keys = ["Parent_1", "Parent_2", "Parent_3", "Child_1", "Child_2", "Child_3", "Child_4", "Child_5", "Child_6", "Child_7"];
          const list = [];
          keys.forEach((k) => {
            const v = String(getField(rec, k) || "").trim();
            if (v) list.push(v);
          });
          // Only use the freetext Participants field as a fallback when no structured Parent/Child names exist
          if (list.length === 0) {
            const participantsText = String(getParticipants(rec) || "").trim();
            if (participantsText) {
              participantsText
                .split(/[;,]\s*|\n+/)
                .map((p) => p.trim())
                .filter(Boolean)
                .forEach((p) => list.push(p));
            }
          }
          // Unique, preserve order
          const seen = new Set();
          return list.filter((p) => {
            const key = p.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        const getGoalsText = (rec) => {
          const direct = getField(rec, "goalsText", "goals_text");
          if (direct) return String(direct);
          const goalParts = [1, 2, 3, 4, 5, 6]
            .map((n) => String(getField(rec, `Goal_${n}`, `goal_${n}`, `goal${n}`) || "").trim())
            .filter(Boolean);
          return goalParts.join("\n");
        };

        const getGoalsArray = (rec) => {
          const parts = [1, 2, 3, 4, 5, 6]
            .map((n) => {
              const text = String(getField(rec, `Goal_${n}`, `goal_${n}`, `goal${n}`) || "").trim();
              return text ? { key: `Goal_${n}`, text } : null;
            })
            .filter(Boolean);

          if (parts.length) return parts;

          const text = String(getField(rec, "goalsText", "goals_text") || "").trim();
          if (!text) return [];

          return text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 10)
            .map((line, idx) => ({ key: `Goal_${idx + 1}`, text: line }));
        };

        // State for archive filter
        const [showArchivedProfiles, setShowArchivedProfiles] = useState(false);

        const familyDirectoryOptions = useMemo(() => {
          const options = caseDirectory
            .map((rec) => {
              const familyId = normalize(getFamilyId(rec));
              const caseName = normalize(getCaseName(rec));
              const mcNumber = normalize(getMasterCaseNumber(rec));
              const cfss = normalize(getCFSS(rec));
              const typicalLocation = normalize(getTypicalLocation(rec));
              const goalsText = normalize(getGoalsText(rec));
              const goals = getGoalsArray(rec);
              const participants = normalize(getParticipants(rec));
              const participantList = getProfileParticipantList(rec);
              const profileLocations = getProfileLocations(rec);
              const key = normalize(rec.id);
              const isArchived = rec.is_archived === true;
              const dischargeStatus = rec.discharge_status || "";
              const dischargeDate = rec.discharge_date || "";
              return {
                key,
                familyId,
                caseName,
                mcNumber,
                cfss,
                typicalLocation,
                participants,
                participantList,
                profileLocations,
                goalsText,
                goals,
                isArchived,
                dischargeStatus,
                dischargeDate,
                raw: rec,
              };
            })
            .filter((o) => o.key && o.caseName);

          options.sort((a, b) => a.caseName.localeCompare(b.caseName));
          return options;
        }, [caseDirectory, referralGoals]);

        // Active profiles only (always excludes archived) — use everywhere except admin
        const activeFamilyDirectoryOptions = useMemo(() => {
          return familyDirectoryOptions.filter(o => !o.isArchived);
        }, [familyDirectoryOptions]);

        // Filtered options based on archive toggle (admin directory view)
        const filteredFamilyDirectoryOptions = useMemo(() => {
          if (showArchivedProfiles) {
            return familyDirectoryOptions.filter(o => o.isArchived);
          }
          return familyDirectoryOptions.filter(o => !o.isArchived);
        }, [familyDirectoryOptions, showArchivedProfiles]);

        // Discharge status labels
        const DISCHARGE_STATUS_OPTIONS = [
          { value: "", label: "— Select Discharge Reason —" },
          { value: "successful", label: "Successful Discharge" },
          { value: "unsuccessful", label: "Unsuccessful Discharge" },
          { value: "family_circumstances", label: "Family Change in Circumstances" },
          { value: "dhhs_case_ended", label: "DHHS Case Ended" },
          { value: "terminated_violence", label: "Terminated - Violence/Threatening Behavior" },
        ];

        const getDischargeLabel = (status) => {
          const opt = DISCHARGE_STATUS_OPTIONS.find(o => o.value === status);
          return opt ? opt.label : status;
        };

        const findCaseMatch = (data) => {
          const selectedKey = normalize(data.family_directory_key || data.family_id);
          if (selectedKey) {
            const selected = familyDirectoryOptions.find((o) => o.key === selectedKey || o.familyId === selectedKey || o.mcNumber === selectedKey);
            if (selected) {
              return {
                id: selected.key,
                caseNumber: selected.mcNumber,
                familyName: selected.caseName,
                goalsText: selected.goalsText,
                goals: selected.goals,
                cfss: selected.cfss,
                typicalLocation: selected.typicalLocation,
              };
            }
          }

          const caseNumber = normalize(data.master_case);
          const familyName = normalizeLower(data.family_name);
          if (!caseNumber && !familyName) return null;

          if (caseNumber) {
            const byCase = familyDirectoryOptions.find((o) => o.mcNumber === caseNumber);
            if (byCase) {
              return {
                id: byCase.key,
                caseNumber: byCase.mcNumber,
                familyName: byCase.caseName,
                goalsText: byCase.goalsText,
                goals: byCase.goals,
                cfss: byCase.cfss,
                typicalLocation: byCase.typicalLocation,
              };
            }
          }

          if (familyName) {
            const byFamily = familyDirectoryOptions.find((o) => normalizeLower(o.caseName) === familyName);
            if (byFamily) {
              return {
                id: byFamily.key,
                caseNumber: byFamily.mcNumber,
                familyName: byFamily.caseName,
                goalsText: byFamily.goalsText,
                goals: byFamily.goals,
                cfss: byFamily.cfss,
                typicalLocation: byFamily.typicalLocation,
              };
            }
          }

          const fromImportedGoals =
            (caseNumber && referralGoals.find((g) => normalize(g.caseNumber) === caseNumber)) ||
            (familyName && referralGoals.find((g) => normalizeLower(g.familyName) === familyName));

          if (fromImportedGoals) {
            return {
              id: fromImportedGoals.caseNumber || fromImportedGoals.id,
              caseNumber: fromImportedGoals.caseNumber,
              familyName: fromImportedGoals.familyName,
              goalsText: fromImportedGoals.goalsText,
            };
          }

          return null;
        };

        const maybeAutofillFromCase = (triggerKey) => {
          const match = findCaseMatch(formData);
          if (!match) return;

          const caseKey = normalize(match.caseNumber || match.id);
          if (!caseKey) return;
          if (lastAutofillKeyRef.current === `${triggerKey}:${caseKey}`) return;

          const next = { ...formData };
          if (!normalize(next.master_case) && normalize(match.caseNumber)) next.master_case = normalize(match.caseNumber);
          if (!normalize(next.family_name) && normalize(match.familyName)) next.family_name = normalize(match.familyName);
          if (!normalize(next.family_id) && normalize(match.id)) next.family_id = normalize(match.id);
          if (!normalize(next.family_directory_key) && normalize(match.id)) next.family_directory_key = normalize(match.id);
          if (!normalize(next.cfss) && normalize(match.cfss)) next.cfss = normalize(match.cfss);
          if (!normalize(next.typical_location) && normalize(match.typicalLocation)) next.typical_location = normalize(match.typicalLocation);
          if (!normalize(next.location) && normalize(match.typicalLocation)) next.location = normalize(match.typicalLocation);
          if (!normalize(next.referral_goals) && normalize(match.goalsText)) next.referral_goals = normalize(match.goalsText);

	          // Goals are handled by the Goals checklist UI; no separate "Progress Toward Goals" field is shown.

	          lastAutofillKeyRef.current = `${triggerKey}:${caseKey}`;
	          setFormData(next);
	        };

	        const GOALS_BLOCK_MARKER = "--- GOALS ---";
	        const GOAL_RATINGS = ["Achieved", "Progressing", "Partially Met", "Not Demonstrated", "N/A"];

	        const composeGoalsBlock = ({ goals = [] }, selectedMap = {}, responseMap = {}, ratingMap = {}, nextStepsMap = {}) => {
	          const selectedGoals = goals.filter((g) => Boolean(selectedMap[g.key]));
	          if (!selectedGoals.length) {
	            return `${GOALS_BLOCK_MARKER}\nGOALS:\n- (none selected)\n`;
	          }

	          const lines = [GOALS_BLOCK_MARKER, "GOALS:"];
	          selectedGoals.forEach((g) => {
	            lines.push(`- ${g.text}`);
	            const rating = String(ratingMap[g.key] || "").trim();
	            if (rating) lines.push(`  Rating: ${rating}`);
	            const resp = String(responseMap[g.key] || "").trim();
	            if (resp) lines.push(`  How addressed: ${resp}`);
	            const nextSteps = String(nextStepsMap[g.key] || "").trim();
	            if (nextSteps) lines.push(`  Next steps: ${nextSteps}`);
	            lines.push("");
	          });
	          return lines.join("\n").replace(/\n{3,}/g, "\n\n");
	        };

	        const ensureDropInId = (dropIn) => {
	          const id = String(dropIn?.id || "").trim();
	          if (id) return id;
	          return `di_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	        };

	        const normalizeDropIns = (dropIns) => {
	          if (!Array.isArray(dropIns)) return [];
	          return dropIns
	            .map((d) => ({
	              id: ensureDropInId(d),
	              start_time: normalize(d?.start_time),
	              end_time: normalize(d?.end_time),
	              narrative: normalize(d?.narrative),
	            }))
	            .filter((d) => d.start_time || d.end_time || d.narrative);
	        };

	        const composeDropInsText = (dropIns) => {
	          const items = normalizeDropIns(dropIns);
	          if (!items.length) return "";
	          const lines = ["DROP-INS (Monitored Visit):"];
	          items.forEach((d, idx) => {
	            const time = [d.start_time, d.end_time].filter(Boolean).map(formatTime12h).join(" - ");
	            lines.push(`${idx + 1}. ${time || "(time not recorded)"}`.trim());
	            if (d.narrative) lines.push(`   ${d.narrative}`);
	            lines.push("");
	          });
	          return lines.join("\n").trim();
	        };

	        const stripGoalsMarker = (text) => {
	          const raw = String(text || "").trim();
	          if (!raw) return "";
	          if (!raw.startsWith(GOALS_BLOCK_MARKER)) return raw;
	          return raw.slice(GOALS_BLOCK_MARKER.length).replace(/^\s+/, "");
	        };

	        const escapeHtml = (val) =>
	          String(val ?? "")
	            .replace(/&/g, "&amp;")
	            .replace(/</g, "&lt;")
	            .replace(/>/g, "&gt;")
	            .replace(/\"/g, "&quot;")
	            .replace(/'/g, "&#039;");

        // Standardized report filename builder
        // Format: lastname.firstname.MasterCase.service.date(monthyear)
        const buildReportFileName = ({ familyName, mcNumber, serviceTypes, month, year, reportType }) => {
          let lastName = "";
          let firstName = "";
          const name = String(familyName || "").trim();
          if (name.includes(",")) {
            const parts = name.split(",").map(s => s.trim());
            lastName = parts[0] || "";
            firstName = parts[1] || "";
          } else {
            const parts = name.split(/\s+/);
            if (parts.length >= 2) {
              firstName = parts[0];
              lastName = parts.slice(1).join(" ");
            } else {
              lastName = parts[0] || "";
            }
          }
          const mc = String(mcNumber || "").trim();
          // Service types - can be a string or array
          const svc = Array.isArray(serviceTypes)
            ? [...new Set(serviceTypes)].filter(Boolean).join("-")
            : String(serviceTypes || "").trim();
          const mo = String(month || "").trim();
          const yr = String(year || "").trim();
          // Build date portion as monthyear (e.g. "January2026")
          const datePart = (mo && yr) ? `${mo}${yr}` : (mo || yr || "");
          // Sanitize parts for filename (remove problematic chars)
          const sanitize = (s) => s.replace(/[/\\:*?"<>|]/g, "").trim();
          const parts = [sanitize(lastName), sanitize(firstName), sanitize(mc), sanitize(svc), sanitize(datePart)].filter(Boolean);
          return parts.join(".");
        };

        const EPWORTH_LOGO_FILE = "/Epworth Family Resources logo.jpeg";
        const EPWORTH_LOGO_SRC = encodeURI(EPWORTH_LOGO_FILE);

	        const EPWORTH_LOGO_SVG = `
	          <svg viewBox="0 0 240 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Epworth Family Resources">
	            <defs>
	              <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
	                <stop offset="0" stop-color="#1d4ed8"/>
	                <stop offset="1" stop-color="#2563eb"/>
	              </linearGradient>
	            </defs>
	            <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#g)"/>
	            <path d="M14 15h21v5H19v4h14v5H19v4h16v5H14V15z" fill="#fff"/>
	            <text x="62" y="22" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="800" fill="#0f172a">
	              Epworth
	            </text>
	            <text x="62" y="39" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="12" font-weight="600" fill="#334155">
	              Family Resources
	            </text>
	          </svg>
	        `.trim();

	        const EPWORTH_LOGO_MARKUP = (() => {
	          const fallbackSvg = EPWORTH_LOGO_SVG.replace("<svg", '<svg style="display:none"');
	          return `
	            <img
	              src="${EPWORTH_LOGO_SRC}"
	              alt="Epworth Family Resources"
	              style="height:44px;width:auto;object-fit:contain;display:block"
	              onerror="this.style.display='none'; const svg=this.parentNode.querySelector('svg'); if(svg) svg.style.display='block';"
	            />
	            ${fallbackSvg}
	          `.trim();
	        })();

		        const printCaseNotes = (entriesToPrint) => {
		          const list = (entriesToPrint || []).filter(Boolean);
		          if (!list.length) return;

			          const renderField = (label, value) => {
		            const v = String(value ?? "")
		              // Some stored values may contain the literal characters "\n" instead of real newlines.
		              .replace(/\\r\\n/g, "\n")
		              .replace(/\\n/g, "\n")
		              .trim();
		            if (!v) return "";
		            return `
		              <section class="section">
		                <div class="section-title">${escapeHtml(label)}</div>
		                <div class="section-body">${escapeHtml(v).replace(/\n/g, "<br/>")}</div>
		              </section>
		            `.trim();
		          };

	          const renderEntry = (entry) => {
	            const service = entry?.service_type || "General";
	            const contact = entry?.contact_type || "N/A";
	            const isCancellation = ["Cancelled by Parent", "Cancelled by Worker", "Cancelled for Weather", "Cancelled by Team", "Cancelled No Confirmation", "Cancelled In Route"].includes(contact);
	            const goals = !isCancellation ? stripGoalsMarker(entry?.goals_progress || "") : "";
	            const isMonitored = contact === "Monitored Visit";
		            const narrativeLabel = isMonitored
		              ? "Drop-ins"
		              : contact === "Phone Call"
		                ? "Phone Call Narrative"
		                : contact === "Text Message"
		                  ? "Text Message Narrative"
		                  : "Session/Visit Narrative";
	            const narrative = String(entry?.visit_narrative || "").trim();
	            const fields = SERVICE_CONFIGS[service] || SERVICE_CONFIGS.default;

	            // For cancelled visits, render special cancellation sections
	            let dynamicSections = "";
	            let cancelSections = "";

	            if (isCancellation) {
	              // Show cancellation-specific documentation
	              const cancelParts = [];
	              if (entry?.weather_explanation) cancelParts.push(renderField("Weather Explanation", entry.weather_explanation));
	              if (entry?.cancellation_notification) cancelParts.push(renderField("Notification to DHHS Case Manager", entry.cancellation_notification));
	              if (entry?.cancellation_service_prep) cancelParts.push(renderField("Service Prep (Family Support/Visitation)", entry.cancellation_service_prep));
	              if (entry?.cancellation_pre_call) cancelParts.push(renderField("Pre-Call Attempt (Drug Testing)", entry.cancellation_pre_call));
	              if (entry?.cancellation_en_route) cancelParts.push(renderField("Were you En Route when cancellation happened?", entry.cancellation_en_route));
	              if (entry?.cancellation_will_makeup) cancelParts.push(renderField("Will this visit be made up?", entry.cancellation_will_makeup));
	              if (entry?.cancellation_makeup_date) cancelParts.push(renderField("When will the visit be made up?", entry.cancellation_makeup_date));
	              if (entry?.cancellation_no_makeup_reason) cancelParts.push(renderField("Why will the visit not be made up?", entry.cancellation_no_makeup_reason));
	              cancelSections = cancelParts.filter(Boolean).join("\n");

	              // If no cancellation fields filled, show a note
	              if (!cancelSections) {
	                cancelSections = `<section class="section"><div class="section-title">Cancellation Documentation</div><div class="section-body">Visit was ${contact.toLowerCase()}. No additional documentation recorded.</div></section>`;
	              }
	            } else {
	              // Standard dynamic sections for non-cancelled visits
		            dynamicSections = fields
		              .filter((id) => !["participants", "visit_narrative", "goals_progress", "safety_concern_present"].includes(id))
		              .map((id) => {
		                const cfg = ALL_COLUMNS.find((c) => c.id === id);
		                if (!cfg) return "";
		                return renderField(cfg.name, entry?.[id] || "");
		              })
		              .filter(Boolean)
		              .join("\n");

	              // Handle safety assessment specially
	              if (fields.includes("safety_concern_present")) {
	                if (entry?.safety_concern_present === "Yes") {
	                  let safetyHtml = `<section class="section"><div class="section-title">Safety Assessment</div><div class="section-body">`;
	                  safetyHtml += `<strong>Safety Concern Present:</strong> Yes<br/>`;
	                  if (entry?.safety_concern_description) safetyHtml += `<strong>Concern:</strong> ${escapeHtml(entry.safety_concern_description).replace(/\n/g, "<br/>")}<br/>`;
	                  if (entry?.safety_concern_addressed) safetyHtml += `<strong>How Addressed:</strong> ${escapeHtml(entry.safety_concern_addressed).replace(/\n/g, "<br/>")}<br/>`;
	                  if (entry?.safety_notification) safetyHtml += `<strong>Notified:</strong> ${escapeHtml(entry.safety_notification)}<br/>`;
	                  if (entry?.safety_hotline_intake) safetyHtml += `<strong>HHS Hotline Intake #:</strong> ${escapeHtml(entry.safety_hotline_intake)}<br/>`;
	                  safetyHtml += `</div></section>`;
	                  dynamicSections += safetyHtml;
	                } else {
	                  dynamicSections += `<section class="section"><div class="section-title">Safety Assessment</div><div class="section-body">No safety concerns identified.</div></section>`;
	                }
	              }

	              // Lab submission info (drug testing)
	              if (entry?.lab_result_text) {
	                const svcUpper = String(entry?.service_type || "").toUpperCase();
	                const isLabBased = svcUpper === "DST-SP" || svcUpper === "DST-HF";
	                const labTitle = isLabBased ? "Lab Report Results" : "Lab Results";
	                dynamicSections += `<section class="section"><div class="section-title">${labTitle}</div><div class="section-body" style="white-space:pre-wrap;font-family:inherit;font-size:9pt;line-height:1.5;">${escapeHtml(entry.lab_result_text).replace(/\n/g, "<br/>")}</div></section>`;
	              } else if (entry?.sent_to_lab === "Yes") {
	                dynamicSections += `<section class="section"><div class="section-title">Lab Submission</div><div class="section-body">Specimen sent to lab — results pending.</div></section>`;
	              }
	              if (entry?.sent_to_lab === "No" && entry?.not_sent_to_lab_reason) {
	                dynamicSections += `<section class="section"><div class="section-title">Not Sent to Lab — Reason</div><div class="section-body">${escapeHtml(entry.not_sent_to_lab_reason).replace(/\n/g, "<br/>")}</div></section>`;
	              }
	            }

		            const cancelBadge = isCancellation ? `<span class="cancelled-badge">Cancelled</span>` : "";

		            return `
		              <article class="page">
		                <header class="header">
		                  <div class="logo">${EPWORTH_LOGO_MARKUP}</div>
		                  <div class="header-meta">
		                    <div class="title">Case Note${cancelBadge}</div>
		                    <div class="subtitle">${escapeHtml(service)} • ${escapeHtml(contact)}</div>
		                  </div>
	                </header>

		                <div class="card meta">
		                  <div><div class="k">Worker</div><div class="v">${escapeHtml(entry?.worker_name || "N/A")}</div></div>
		                  <div><div class="k">Credentials</div><div class="v">${escapeHtml(entry?.worker_credential || "N/A")}</div></div>
		                  <div><div class="k">Family</div><div class="v">${escapeHtml(entry?.family_name || "N/A")}</div></div>
		                  <div><div class="k">Master Case #</div><div class="v mono">${escapeHtml(entry?.master_case || "N/A")}</div></div>
		                  <div><div class="k">Date</div><div class="v">${escapeHtml(entry?.date || "N/A")}</div></div>
		                  <div><div class="k">Start Time</div><div class="v">${escapeHtml(formatTime12h(entry?.start_time) || "N/A")}</div></div>
		                  <div><div class="k">End Time</div><div class="v">${escapeHtml(formatTime12h(entry?.end_time) || "N/A")}</div></div>
	                  <div class="span-2"><div class="k">Location</div><div class="v">${escapeHtml(entry?.location || "N/A")}</div></div>
	                  ${!isCancellation ? `<div class="span-2"><div class="k">Participants</div><div class="v">${escapeHtml(entry?.participants || "N/A")}</div></div>` : ""}
	                </div>

	                ${goals ? renderField("Goals", goals) : ""}
	                ${narrative ? renderField(narrativeLabel, narrative) : ""}
	                ${cancelSections}
	                ${dynamicSections}

	                <footer class="footer">
	                  <div>Epworth Family Resources</div>
	                  <div>Generated ${escapeHtml(new Date().toLocaleString())}</div>
	                </footer>
	              </article>
		            `.trim();
		          };

		          const pagesHtml = list.map(renderEntry).join("\n");

		          // Build standardized filename for case note prints
		          const printTitle = (() => {
		            const first = list[0];
		            if (!first) return "Case Notes";
		            const serviceTypes = [...new Set(list.map(e => e.service_type).filter(Boolean))];
		            const entryDate = first.date ? new Date(first.date + "T00:00:00") : new Date();
		            return buildReportFileName({
		              familyName: first.family_name,
		              mcNumber: first.master_case,
		              serviceTypes,
		              month: entryDate.toLocaleString("en-US", { month: "long" }),
		              year: String(entryDate.getFullYear()),
		              reportType: "Case Notes",
		            });
		          })();

		          // Print via a hidden iframe so the output is a clean document (no app overlays/side tabs).
		          const baseHref = String(window.location.href || "").replace(/[?#].*$/, "").replace(/[^/]*$/, "");

		          const docHtml = `
		            <!doctype html>
		            <html lang="en">
		              <head>
		                <meta charset="utf-8" />
		                <meta name="viewport" content="width=device-width, initial-scale=1" />
		                <base href="${escapeHtml(baseHref)}" />
		                <title>${escapeHtml(printTitle)}</title>
		                <style>
		                  @page { size: letter; margin: 0.4in 0.5in; }
		                  * { box-sizing: border-box; margin: 0; padding: 0; }
		                  html, body {
		                    font-family: Arial, sans-serif;
		                    font-size: 9pt;
		                    line-height: 1.3;
		                    color: #000;
		                    padding: 0;
		                  }
		                  .page { page-break-after: always; }
		                  .page:last-child { page-break-after: auto; }
		                  .header {
		                    display: flex;
		                    align-items: center;
		                    gap: 10px;
		                    padding-bottom: 6px;
		                    border-bottom: 2px solid #1E3A5F;
		                    margin-bottom: 8px;
		                  }
		                  .logo svg, .logo img { height: 32px; width: auto; display: block; object-fit: contain; }
		                  .title {
		                    font-size: 13pt;
		                    font-weight: bold;
		                    text-transform: uppercase;
		                    color: #1E3A5F;
		                  }
		                  .subtitle {
		                    font-size: 8pt;
		                    font-weight: 600;
		                    color: #1E3A5F;
		                    margin-top: 1px;
		                  }
		                  .card {
		                    border: 1px solid #ccc;
		                    padding: 6px 8px;
		                    margin: 6px 0;
		                    background: #f8f9fa;
		                  }
		                  .meta { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px 10px; }
		                  .meta .span-2 { grid-column: span 2; }
		                  .k {
		                    font-size: 6.5pt;
		                    font-weight: bold;
		                    text-transform: uppercase;
		                    letter-spacing: 0.04em;
		                    color: #1E3A5F;
		                  }
		                  .v {
		                    font-size: 8.5pt;
		                    font-weight: 600;
		                    color: #000;
		                    margin-top: 0;
		                  }
		                  .mono { font-family: 'Courier New', monospace; font-size: 8.5pt; }
		                  .section { margin: 6px 0; page-break-inside: avoid; }
		                  .section-title {
		                    background: #1E3A5F;
		                    color: white;
		                    padding: 3px 6px;
		                    font-size: 8pt;
		                    font-weight: bold;
		                    text-transform: uppercase;
		                    margin-bottom: 4px;
		                  }
		                  .section-body {
		                    font-size: 8.5pt;
		                    line-height: 1.4;
		                    color: #000;
		                    padding: 4px 6px;
		                    border: 1px solid #ddd;
		                    background: #fafafa;
		                    white-space: pre-wrap;
		                  }
		                  .section-body strong {
		                    font-weight: bold;
		                    color: #1E3A5F;
		                  }
		                  .footer {
		                    display: flex;
		                    justify-content: space-between;
		                    gap: 10px;
		                    font-size: 7pt;
		                    font-weight: 500;
		                    color: #666;
		                    border-top: 1px solid #ddd;
		                    padding-top: 6px;
		                    margin-top: 8px;
		                  }
		                  .cancelled-badge {
		                    display: inline-block;
		                    background: #fef2f2;
		                    color: #991b1b;
		                    padding: 1px 5px;
		                    border-radius: 3px;
		                    font-size: 7pt;
		                    font-weight: bold;
		                    text-transform: uppercase;
		                    margin-left: 5px;
		                    border: 1px solid #fca5a5;
		                  }
		                  @media print {
		                    body { padding: 0; }
		                    .section { page-break-inside: avoid; }
		                  }
		                </style>
		              </head>
		              <body>
		                ${pagesHtml}
		              </body>
		            </html>
		          `.trim();

		          const fallbackInPagePrint = () => {
		            setPrintHtml(pagesHtml);
		            setTimeout(() => {
		              try {
		                window.focus();
		                window.print();
		              } catch {}
		            }, 50);
		          };

		          try {
		            const iframe = document.createElement("iframe");
		            iframe.setAttribute("aria-hidden", "true");
		            iframe.style.position = "fixed";
		            iframe.style.right = "0";
		            iframe.style.bottom = "0";
		            iframe.style.width = "0";
		            iframe.style.height = "0";
		            iframe.style.border = "0";

		            document.body.appendChild(iframe);

		            const w = iframe.contentWindow;
		            const d = iframe.contentDocument || w?.document;
		            if (!w || !d) throw new Error("Print iframe unavailable");

		            d.open();
		            d.write(docHtml);
		            d.close();

		            const waitForAssets = async () => {
		              try {
		                if (d.fonts && d.fonts.ready) {
		                  await d.fonts.ready.catch(() => {});
		                }
		              } catch {}
		              const imgs = Array.from(d.images || []);
		              if (imgs.length) {
		                await Promise.all(
		                  imgs.map(
		                    (img) =>
		                      img.complete
		                        ? Promise.resolve()
		                        : new Promise((resolve) => {
		                            img.onload = () => resolve();
		                            img.onerror = () => resolve();
		                          })
		                  )
		                );
		              }
		            };

		            // Some browsers don't reliably fire onload for iframe document writes; use a short delay.
		            setTimeout(async () => {
		              try {
		                await waitForAssets();
		                w.focus();
		                w.print();
		              } catch (err) {
		                console.warn("Iframe print failed, falling back to in-page print:", err);
		                fallbackInPagePrint();
		              } finally {
		                setTimeout(() => iframe.remove(), 2000);
		              }
		            }, 150);
		          } catch (err) {
		            console.warn("Print setup failed, falling back to in-page print:", err);
		            fallbackInPagePrint();
		          }
		        };

	        useEffect(() => {
	          const onAfterPrint = () => setPrintHtml("");
	          window.addEventListener("afterprint", onAfterPrint);
	          return () => window.removeEventListener("afterprint", onAfterPrint);
	        }, []);

	        useEffect(() => {
	          // Debounce goals block composition to prevent focus loss while typing
	          if (goalsDebounceRef.current) {
	            clearTimeout(goalsDebounceRef.current);
	          }
	          goalsDebounceRef.current = setTimeout(() => {
	            const match = findCaseMatch(formData);
	            if (!match || !match.goals || !match.goals.length) return;

	            const nextBlock = composeGoalsBlock(
	              match,
	              formData.goals_selected || {},
	              formData.goals_addressed || {},
	              formData.goals_ratings || {},
	              formData.goals_next_steps || {}
	            );
	            if (nextBlock !== String(formData.goals_progress || "")) {
	              setFormData((prev) => ({ ...prev, goals_progress: nextBlock }));
	            }
	          }, 300);
	          return () => {
	            if (goalsDebounceRef.current) {
	              clearTimeout(goalsDebounceRef.current);
	            }
	          };
	        }, [
	          formData.family_directory_key,
	          formData.master_case,
	          formData.family_name,
	          formData.goals_selected,
	          formData.goals_addressed,
	          formData.goals_ratings,
	          formData.goals_next_steps,
	        ]);

	        useEffect(() => {
	          if (formData.contact_type !== "Monitored Visit") return;
	          setFormData((prev) => {
	            const existing = Array.isArray(prev.dropins) ? prev.dropins : [];
	            const nextDropIns = existing.length
	              ? existing.map((d) => ({ ...d, id: ensureDropInId(d) }))
	              : [{ id: ensureDropInId({}), start_time: "", end_time: "", narrative: "" }];
	            const activeId = normalize(prev.dropin_active_id);
	            const nextActiveId = nextDropIns.some((d) => d.id === activeId) ? activeId : nextDropIns[0].id;
	            const nextNarrative = composeDropInsText(nextDropIns);
	            return {
	              ...prev,
	              dropins: nextDropIns,
	              dropin_active_id: nextActiveId,
	              visit_narrative: nextNarrative,
	            };
	          });
	        }, [formData.contact_type]);

	        useEffect(() => {
	          if (formData.contact_type !== "Monitored Visit") return;
	          const nextNarrative = composeDropInsText(formData.dropins);
	          if (nextNarrative === normalize(formData.visit_narrative)) return;
	          setFormData((prev) => ({ ...prev, visit_narrative: nextNarrative }));
	        }, [formData.contact_type, formData.dropins]);

	        useEffect(() => {
	          if (!caseDirectory.length && !referralGoals.length) return;
	          if (normalize(formData.master_case) || normalize(formData.family_name)) {
	            // Debounce autofill to prevent focus loss while typing
	            if (autofillDebounceRef.current) {
	              clearTimeout(autofillDebounceRef.current);
	            }
	            autofillDebounceRef.current = setTimeout(() => {
	              maybeAutofillFromCase("case-input");
	            }, 500);
          }
          return () => {
            if (autofillDebounceRef.current) {
              clearTimeout(autofillDebounceRef.current);
            }
          };
        }, [caseDirectory, referralGoals, formData.master_case, formData.family_name, formData.service_type]);

        const upsertCaseDirectory = async ({ master_case, family_name, goalsText }) => {
          const caseNumber = normalize(master_case);
          const familyName = normalize(family_name);
          if (!caseNumber && !familyName) return;

          const docId = normalize(formData.family_id) || caseNumber || familyName;
          const payload = {
            caseNumber: caseNumber || null,
            familyName: familyName || null,
            goalsText: normalize(goalsText) || null,
            Participants: normalize(formData.participants) || null,
            last_location: normalize(formData.location) || null,
            ...(normalize(formData.location) ? { locations: firebase.firestore.FieldValue.arrayUnion(normalize(formData.location)) } : {}),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          };

          const tryWrite = async (directoryRef) => {
            if (!directoryRef) throw new Error("Database not ready.");
            await directoryRef.doc(docId).set(payload, { merge: true });
          };

          try {
            await tryWrite(sharedCaseDirectoryRef);
          } catch (err) {
            const message = String(err?.message || err);
            console.warn("Shared directory write failed, falling back to user-scoped:", message);
            await tryWrite(userCaseDirectoryRef);
          }
        };

        const hashString = (input) => {
          const str = String(input || "");
          let hash = 2166136261;
          for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
          }
          return (hash >>> 0).toString(36);
        };

        const saveLocation = async (locationText) => {
          if (!savedLocationsRef) return;
          const value = normalize(locationText);
          if (!value) return;
          const slug = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 80);
          const docId = `${slug || "loc"}_${hashString(value)}`;
          await savedLocationsRef.doc(docId).set(
            {
              value,
              label: value,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        };

        const saveLocationToProfile = async (locationText, profileKey) => {
          const value = normalize(locationText);
          const docId = normalize(profileKey || formData.family_id || formData.family_directory_key);
          if (!value || !docId) return;

          const nowServer = firebase.firestore.FieldValue.serverTimestamp();
          const payload = {
            last_location: value,
            updatedAt: nowServer,
            locations: firebase.firestore.FieldValue.arrayUnion(value),
          };

          const tryWrite = async (directoryRef) => {
            if (!directoryRef) throw new Error("Database not ready.");
            await directoryRef.doc(docId).set(payload, { merge: true });
          };

          try {
            await tryWrite(sharedCaseDirectoryRef);
          } catch (err) {
            const message = String(err?.message || err);
            console.warn("Shared profile location write failed, falling back to user-scoped:", message);
            await tryWrite(userCaseDirectoryRef);
          }
        };

        const AUTO_SYNC_STORAGE_KEY = "case_note_csv_auto_sync_hash_v1";

        // Auto-sync profiles from the project CSV so you don't have to re-import manually.
        useEffect(() => {
          if (!autoSyncCsvEnabled) return;
          if (!user) return;
          if (!db) return;
          if (importInProgress) return;
          if (loadingDirectory) return;
          if (autoSyncAttemptedRef.current) return;

          // If profiles already exist, only sync if the file changed (hash differs).
          autoSyncAttemptedRef.current = true;

          const run = async () => {
            try {
              const resp = await fetch("Family%20Database.csv", { cache: "no-store" });
              if (!resp.ok) return;
              const text = await resp.text();
              if (!String(text || "").trim()) return;

              const nextHash = hashString(text);
              const prevHash = localStorage.getItem(AUTO_SYNC_STORAGE_KEY) || "";

              const hasProfiles = familyDirectoryOptions.length > 0;
              const changed = nextHash !== prevHash;
              if (hasProfiles && !changed) return;

              await importDirectoryFromCsvText(text, "Family Database.csv (auto)", "overwrite", { navigateOnSuccess: false });
              localStorage.setItem(AUTO_SYNC_STORAGE_KEY, nextHash);
            } catch (err) {
              console.warn("Auto-sync failed:", err);
            }
          };

          run();
        }, [autoSyncCsvEnabled, user, db, importInProgress, loadingDirectory, familyDirectoryOptions.length]);

		        const handleSubmit = async (e) => {
		          e.preventDefault();
		          if (!user || !db || !entriesRef) return;

			          // Prevent duplicate submissions
			          if (submitting) {
			            showToast("Please wait - save in progress...");
			            return;
			          }

			          // Keep a copy so we can restore if the background write fails.
			          lastDraftRef.current = { ...(formData || {}) };

			          setSubmitting(true);
			          setSaveError("");
			          setSaveWarning("");
			          setSaveToast("");

			          try {
			            if (submitGuardRef.current) clearTimeout(submitGuardRef.current);
			          } catch {}

			          // Track if save is taking too long - but DON'T unlock form (prevents duplicates)
			          let saveTimedOut = false;
			          submitGuardRef.current = setTimeout(() => {
			            saveTimedOut = true;
			            setSaveWarning("Save is taking longer than expected. Please wait - do not submit again.");
			          }, APP_CONSTANTS.SAVE_TIMEOUT_MS);

			          const withTimeout = (promise, ms, label) => {
			            let timerId;
			            const timeout = new Promise((_, reject) => {
			              timerId = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
			            });
			            return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
			              if (timerId) clearTimeout(timerId);
			            });
			          };

			          try {
			            const match = findCaseMatch(formData);
			            const inferredGoalsText = match?.goalsText || formData.referral_goals || "";

			            let goalsProgress = formData.goals_progress || "";
			            if (match?.goals?.length) {
			              goalsProgress = composeGoalsBlock(
			                match,
			                formData.goals_selected || {},
			                formData.goals_addressed || {},
			                formData.goals_ratings || {},
			                formData.goals_next_steps || {}
			              );
			            }

			            const isMonitoredVisit = formData.contact_type === "Monitored Visit";
			            const normalizedDropIns = normalizeDropIns(formData.dropins);
			            const dropInsText = isMonitoredVisit ? composeDropInsText(normalizedDropIns) : "";

			            // Calculate units used for this entry
			            const calculateEntryUnits = () => {
			              const serviceType = String(formData.service_type || "").toUpperCase();
			              const isDrugTest = serviceType.startsWith("DST");

			              if (isDrugTest) {
			                return { type: "occurrence", value: 1 };
			              }

			              if (formData.start_time && formData.end_time) {
			                const [startH, startM] = formData.start_time.split(":").map(Number);
			                const [endH, endM] = formData.end_time.split(":").map(Number);
			                const startMins = (startH || 0) * 60 + (startM || 0);
			                const endMins = (endH || 0) * 60 + (endM || 0);
			                const durationHours = Math.max(0, (endMins - startMins) / 60);
			                return { type: "hours", value: Math.round(durationHours * 100) / 100 };
			              }

			              return { type: "hours", value: 0 };
			            };

			            const entryUnits = calculateEntryUnits();

				            // Lab-based tests (Sweat Patch, Hair Follicle) always go to lab
				            const isLabBasedEntry = ["DST-SP", "DST-HF"].includes(String(formData.service_type || "").toUpperCase());

				            const newEntry = {
				              ...formData,
			              // Auto-set sent_to_lab for lab-based tests
			              ...(isLabBasedEntry ? { sent_to_lab: "Yes" } : {}),
			              dropins: normalizedDropIns,
			              dropins_text: dropInsText,
			              visit_narrative: isMonitoredVisit ? dropInsText : formData.visit_narrative,
			              goals_progress: goalsProgress,
			              goals_selected: Object.keys(formData.goals_selected || {}).filter((k) => Boolean(formData.goals_selected[k])),
			              goals_addressed: formData.goals_addressed || {},
			              goals_ratings: formData.goals_ratings || {},
			              goals_next_steps: formData.goals_next_steps || {},
			              referral_goals: formData.referral_goals || inferredGoalsText || "",
			              units_used: entryUnits.value,
			              units_type: entryUnits.type,
			              createdAt: editingEntryId ? formData.createdAt || firebase.firestore.FieldValue.serverTimestamp() : firebase.firestore.FieldValue.serverTimestamp(),
			              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
			              timestampStr: new Date().toLocaleString(),
			            };

				            // Start saving - wait for confirmation before resetting form
				            const savePromise = editingEntryId
				              ? entriesRef.doc(editingEntryId).set(newEntry, { merge: true })
				              : entriesRef.add(newEntry);

				            // Wait for save to complete OR timeout - but don't reset until we know it succeeded
				            const quickResult = await Promise.race([
				              savePromise.then(() => ({ status: "ok" })).catch((err) => ({ status: "err", err })),
				              new Promise((resolve) => setTimeout(() => resolve({ status: "pending" }), APP_CONSTANTS.QUICK_SAVE_TIMEOUT_MS)),
				            ]);

				            if (quickResult.status === "err") throw quickResult.err;

				            // If still pending, wait for actual completion before resetting
				            if (quickResult.status === "pending") {
				              showToast(editingEntryId ? "Entry updating… (syncing)" : "Entry saving… (syncing)");
				              try {
				                await savePromise; // Wait for actual completion
				                showToast(editingEntryId ? "Entry updated." : "Entry saved.");
				              } catch (err) {
				                throw err; // Will be caught by outer catch
				              }
				            } else {
				              showToast(editingEntryId ? "Entry updated." : "Entry saved.");
				            }

            // Log audit event for entry save
            await logAuditEvent(
              editingEntryId ? "updated" : "created",
              "entry",
              {
                entry_id: editingEntryId || "new",
                family_name: newEntry.family_name,
                service_type: newEntry.service_type,
                service_date: newEntry.service_date,
              }
            );

				            // Only reset form AFTER save is confirmed successful
				            resetForNewEntry();
				            setActiveTab("form");

			            try {
			              if (submitGuardRef.current) clearTimeout(submitGuardRef.current);
			            } catch {}
			            submitGuardRef.current = null;

			            // Run side effects in background (non-blocking)
			            const runSideEffects = async () => {
			              const sideEffects = [];
			              sideEffects.push(
			                withTimeout(
			                  upsertCaseDirectory({
			                    master_case: newEntry.master_case,
			                    family_name: newEntry.family_name,
			                    goalsText: inferredGoalsText,
			                  }),
			                  APP_CONSTANTS.SIDE_EFFECT_TIMEOUT_MS,
			                  "Saving client directory"
			                ).catch((err) => {
			                  console.warn("Non-blocking: client directory update failed:", err);
			                  return { ok: false, label: "client directory", err };
			                })
			              );
			              sideEffects.push(
			                withTimeout(saveLocation(newEntry.location), APP_CONSTANTS.SIDE_EFFECT_TIMEOUT_MS, "Saving location").catch((err) => {
			                  console.warn("Non-blocking: location save failed:", err);
			                  return { ok: false, label: "location", err };
			                })
			              );
			              sideEffects.push(
			                withTimeout(
			                  saveLocationToProfile(newEntry.location, newEntry.family_id || newEntry.family_directory_key),
			                  APP_CONSTANTS.SIDE_EFFECT_TIMEOUT_MS,
			                  "Saving location to profile"
			                ).catch((err) => {
			                  console.warn("Non-blocking: profile location save failed:", err);
			                  return { ok: false, label: "profile location", err };
			                })
			              );

			              const results = await Promise.allSettled(sideEffects);
			              const failures = results
			                .map((r) => (r.status === "fulfilled" ? r.value : r.reason))
			                .filter((v) => v && v.ok === false);
			              if (failures.length) {
			                // Show persistent warning for background failures
			                setSaveWarning(
			                  `Entry saved, but ${failures.length} background sync(s) failed: ${failures.map(f => f.label).join(", ")}. This won't affect your case note.`
			                );
			              }
			            };

				            // Run side effects without blocking
				            runSideEffects().catch((err) => {
			                console.warn("Side effects failed:", err);
			              });
			          } catch (error) {
			            console.error("Error adding document: ", error);
			            setSaveError(String(error?.message || error));
			          } finally {
			            try {
			              if (submitGuardRef.current) clearTimeout(submitGuardRef.current);
			            } catch {}
			            submitGuardRef.current = null;
			            setSubmitting(false);
				          }
				        };

	        const handleDelete = async (id) => {
            // Get entry details for audit log
            const entryToDelete = entries.find(e => e.id === id);

            // Log delete attempt
            await logAuditEvent("delete_attempt", "entry", {
              entry_id: id,
              family_name: entryToDelete?.family_name || "unknown",
              service_type: entryToDelete?.service_type || "unknown",
              service_date: entryToDelete?.service_date || "unknown",
            });

	          if (!confirm("Delete this case note?")) return;
	          try {
	            await entriesRef.doc(id).delete();

            // Log successful deletion
            await logAuditEvent("deleted", "entry", {
              entry_id: id,
              family_name: entryToDelete?.family_name || "unknown",
              service_type: entryToDelete?.service_type || "unknown",
              service_date: entryToDelete?.service_date || "unknown",
            });
	          } catch (error) {
	            console.error("Error deleting: ", error);
	          }
	        };

	        const startEditEntry = (entry) => {
	          if (!entry) return;
	          const next = { ...(entry || {}) };
	          const id = next.id;
	          delete next.id;

	          // Convert goals_selected from array (as saved) back to object format (as form expects)
	          // Saved format: ["goal_1", "goal_2"] -> Form format: { goal_1: true, goal_2: true }
	          if (Array.isArray(next.goals_selected)) {
	            const selectedObj = {};
	            next.goals_selected.forEach((key) => {
	              if (key) selectedObj[key] = true;
	            });
	            next.goals_selected = selectedObj;
	          } else if (!next.goals_selected || typeof next.goals_selected !== "object") {
	            next.goals_selected = {};
	          }

	          // Ensure goals_addressed, goals_ratings, goals_next_steps are objects
	          if (!next.goals_addressed || typeof next.goals_addressed !== "object") {
	            next.goals_addressed = {};
	          }
	          if (!next.goals_ratings || typeof next.goals_ratings !== "object") {
	            next.goals_ratings = {};
	          }
	          if (!next.goals_next_steps || typeof next.goals_next_steps !== "object") {
	            next.goals_next_steps = {};
	          }

	          setEditingEntryId(id || "");
	          setFormData(next);
	          setActiveTab("form");
	        };

		        const cancelEditEntry = () => {
		          resetForNewEntry();
		          showToast("Edit cancelled.");
		        };

        // CSV file uploads were removed; paste import remains available.

	        const importDirectoryFromCsvText = async (text, sourceName = "", mode = "overwrite", options = {}) => {
	          if (!goalsRef || !db) return;
	          const opts = options && typeof options === "object" ? options : {};
	          const navigateOnSuccess = Boolean(opts.navigateOnSuccess);
	          let guardId = null;
	          setImportSummary(null);
	          setImportStatus("");
	          const trimmed = String(text || "").trim();
	          if (!trimmed) {
	            showToast("Paste box is empty.");
	            return 0;
	          }

	          try {
	            setImportInProgress(true);
	            guardId = window.setTimeout(() => {
	              setImportInProgress(false);
	              setSaveWarning("Import is still syncing. You can continue working; profiles will appear once syncing finishes.");
	            }, 8000);
	            const lines = String(text).split(/\r?\n/);
            const firstLineRaw = (lines[0] || "").replace(/^\uFEFF/, "");
            const commaCount = (firstLineRaw.match(/,/g) || []).length;
            const tabCount = (firstLineRaw.match(/\t/g) || []).length;
            const delimiter = tabCount > commaCount ? "\t" : ",";

            const parseDelimitedLine = (line) =>
              line
                .replace(/^\uFEFF/, "")
                .split(new RegExp(`${delimiter === "\t" ? "\\t" : ","}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                .map((c) => c.trim().replace(/^"|"$/g, ""));

            const headerCols = parseDelimitedLine(firstLineRaw);
            const hasHeader = headerCols.some((h) => /family_id|case_name|mc_number/i.test(String(h || "")));
            const headers = hasHeader ? headerCols : [];

            const isEmpty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
            const compact = (obj) => {
              const out = {};
              Object.entries(obj || {}).forEach(([k, v]) => {
                if (!isEmpty(v)) out[k] = v;
              });
              return out;
            };

            let rowsRead = 0;
            let rowsUpserted = 0;
            let docsCreated = 0;
            let docsUpdated = 0;
            let docsSkipped = 0;
            const errors = [];
            let writeScopeUsed = "unknown";

            const runImport = async (directoryWriteRef, goalsWriteRef, scopeLabel) => {
              if (!directoryWriteRef || !goalsWriteRef) throw new Error("Database not ready.");

              let batch = db.batch();
              let opCount = 0;

              const commitBatchIfNeeded = async () => {
                if (opCount >= 400) {
                  await batch.commit();
                  batch = db.batch();
                  opCount = 0;
                }
              };

              const stageSet = (docRef, payload, { merge = true } = {}) => {
                batch.set(docRef, payload, { merge });
                opCount += 1;
              };

              rowsUpserted = 0;
              docsCreated = 0;
              docsUpdated = 0;
              docsSkipped = 0;

              if (mode === "overwrite") {
                setImportStatus(`Importing (overwrite) → ${scopeLabel}…`);
                for (let i = 0; i < records.length; i++) {
                  const rec = records[i];
                  const caseRef = directoryWriteRef.doc(rec.docId);
                  const goalsDocRef = goalsWriteRef.doc(rec.docId);
                  if (Object.keys(rec.casePayload).length) {
                    stageSet(caseRef, { ...rec.casePayload, updatedAt: nowServer }, { merge: true });
                  }
                  if (Object.keys(rec.goalsPayload).length) {
                    stageSet(goalsDocRef, { ...rec.goalsPayload, updatedAt: nowServer }, { merge: true });
                  }
                  rowsUpserted++;
                  await commitBatchIfNeeded();
                }
                docsUpdated = rowsUpserted;
              } else {
                setImportStatus(`Importing (fill-missing) → ${scopeLabel}…`);
                const pickMissing = (existing, incoming) => {
                  const out = {};
                  Object.entries(incoming || {}).forEach(([k, v]) => {
                    if (isEmpty(v)) return;
                    const current = existing?.[k];
                    if (isEmpty(current)) out[k] = v;
                  });
                  return out;
                };

                for (let i = 0; i < records.length; i++) {
                  const rec = records[i];
                  const caseRef = directoryWriteRef.doc(rec.docId);
                  const goalsDocRef = goalsWriteRef.doc(rec.docId);

                  const [caseSnap, goalsSnap] = await Promise.all([caseRef.get(), goalsDocRef.get()]);
                  const caseData = caseSnap?.exists ? caseSnap.data() : {};
                  const goalsData = goalsSnap?.exists ? goalsSnap.data() : {};

                  const caseMissing = pickMissing(caseData, rec.casePayload);
                  const goalsMissing = pickMissing(goalsData, rec.goalsPayload);

                  if (Object.keys(caseMissing).length) {
                    stageSet(
                      caseRef,
                      { ...caseMissing, updatedAt: nowServer, ...(caseSnap && !caseSnap.exists ? { createdAt: nowServer } : {}) },
                      { merge: true }
                    );
                  }
                  if (Object.keys(goalsMissing).length) {
                    stageSet(
                      goalsDocRef,
                      { ...goalsMissing, updatedAt: nowServer, ...(goalsSnap && !goalsSnap.exists ? { createdAt: nowServer } : {}) },
                      { merge: true }
                    );
                  }

                  if (Object.keys(caseMissing).length || Object.keys(goalsMissing).length) {
                    rowsUpserted++;
                    if ((caseSnap && !caseSnap.exists) || (goalsSnap && !goalsSnap.exists)) docsCreated++;
                    else docsUpdated++;
                    await commitBatchIfNeeded();
                  } else {
                    docsSkipped++;
                  }
                }
              }

              if (opCount > 0) await batch.commit();
              writeScopeUsed = scopeLabel;
            };

            const dataLines = hasHeader ? lines.slice(1) : lines;
            const records = [];

            for (const line of dataLines) {
              if (!line.trim()) continue;
              rowsRead++;
              try {
                const cols = parseDelimitedLine(line);
                if (hasHeader) {
                  const row = {};
                  headers.forEach((h, idx) => {
                    row[h] = cols[idx] ?? "";
                  });

                  const familyId = String(row["Family_ID"] || row["family_id"] || row["Family Id"] || row["FamilyID"] || "").trim();
                  const caseName = String(row["Case_Name"] || row["case_name"] || row["Case Name"] || "").trim();
                  const mcNumber = String(row["MC_Number"] || row["mc_number"] || row["MC Number"] || "").trim();
                  const cfss = String(row["CFSS"] || row["cfss"] || "").trim();
                  const typicalLocation = String(row["Typical_Location"] || row["typical_location"] || row["Typical Location"] || "").trim();

                  const goalParts = [1, 2, 3, 4, 5, 6]
                    .map((n) => row[`Goal_${n}`] || row[`goal_${n}`] || row[`Goal ${n}`] || "")
                    .map((g) => String(g || "").trim())
                    .filter(Boolean);
                  const goalsText = goalParts.join("\n");

                  // Always generate a unique docId for imports to prevent overwrites
                  // This ensures each imported row creates a separate profile
                  const docId = generateUniqueId();
                  const generatedFamilyId = docId; // Set Family_ID to the unique ID

                  if (!caseName && !mcNumber) continue; // Need at least a name or MC#

                  const casePayload = compact({
                    Family_ID: generatedFamilyId, // Always use generated unique ID
                    Case_Name: caseName,
                    MC_Number: mcNumber,
                    CFSS: cfss,
                    Typical_Location: typicalLocation,
                    Goal_1: row["Goal_1"],
                    Goal_2: row["Goal_2"],
                    Goal_3: row["Goal_3"],
                    Goal_4: row["Goal_4"],
                    Goal_5: row["Goal_5"],
                    Goal_6: row["Goal_6"],
                    goalsText,
                    Parent_1: row["Parent_1"],
                    Parent_2: row["Parent_2"],
                    Parent_3: row["Parent_3"],
                    Child_1: row["Child_1"],
                    Child_2: row["Child_2"],
                    Child_3: row["Child_3"],
                    Child_4: row["Child_4"],
                    Child_5: row["Child_5"],
                    Child_6: row["Child_6"],
                    Child_7: row["Child_7"],
                  });

                  const goalsPayload = compact({
                    caseNumber: mcNumber || familyId,
                    familyName: caseName,
                    goalsText,
                  });

                  records.push({ docId, casePayload, goalsPayload });
                } else if (cols.length >= 3) {
                  const caseNum = String(cols[0] || "").trim();
                  const family = String(cols[1] || "").trim();
                  const goals = String(cols[2] || "").trim();
                  if (!caseNum || caseNum === "Master Case #") continue;

                  // Always generate unique ID for imports
                  const docId = generateUniqueId();
                  records.push({
                    docId,
                    casePayload: compact({ Family_ID: docId, MC_Number: caseNum, Case_Name: family, goalsText: goals }),
                    goalsPayload: compact({ caseNumber: caseNum, familyName: family, goalsText: goals }),
                  });
                }
              } catch (err) {
                errors.push(String(err?.message || err));
              }
            }

            const pickMissing = (existing, incoming) => {
              const out = {};
              Object.entries(incoming || {}).forEach(([k, v]) => {
                if (isEmpty(v)) return;
                const current = existing?.[k];
                if (isEmpty(current)) out[k] = v;
              });
              return out;
            };

            const nowServer = firebase.firestore.FieldValue.serverTimestamp();

            // Try shared write; if it fails due to permissions, retry to user-scoped.
            try {
              await runImport(sharedCaseDirectoryRef, sharedGoalsRef, "shared");
            } catch (err) {
              const message = String(err?.message || err);
              console.warn("Shared import failed:", message);
              errors.push(`Shared import failed: ${message}`);
              await runImport(userCaseDirectoryRef, userGoalsRef, "user");
            }

            try {
              if (user && db) {
                const metaRef = db
                  .collection("artifacts")
                  .doc(appId)
                  .collection("users")
                  .doc(user.uid)
                  .collection("meta")
                  .doc("imports");
                await metaRef.set(
                  {
                    directory_lastImportAt: firebase.firestore.FieldValue.serverTimestamp(),
                    directory_lastImportSource: sourceName || "pasted",
                    directory_lastImportRowsRead: rowsRead,
                    directory_lastImportRowsUpserted: rowsUpserted,
                    directory_lastImportDelimiter: delimiter === "\t" ? "tab" : "comma",
                    directory_lastImportHeaderDetected: hasHeader,
                    directory_lastImportMode: mode,
                    directory_lastImportWriteScope: writeScopeUsed,
                  },
                  { merge: true }
                );
              }
            } catch (err) {
              console.warn("Import metadata save failed:", err);
            }

            setImportSummary({
              rowsRead,
              rowsUpserted,
              docsCreated,
              docsUpdated,
              docsSkipped,
              delimiter: delimiter === "\t" ? "tab" : "comma",
              hasHeader,
              headers: headers.slice(0, 30),
              errorCount: errors.length,
              firstError: errors[0] || "",
              sourceName: sourceName || "pasted",
              mode,
              writeScopeUsed,
            });

            if (errors.length) {
              console.error("Import errors:", errors.slice(0, 5));
            }

	            if (rowsUpserted > 0) {
	              showToast(`Imported ${rowsUpserted} profile${rowsUpserted === 1 ? "" : "s"}.`);
	              if (navigateOnSuccess) {
	                // Optionally jump to the Profiles view in History.
	                setHistoryMode("profiles");
	                setActiveTab("table");
	              }
	              return rowsUpserted;
	            } else {
	              showToast("No valid rows found. Check headers/format.");
	              return 0;
	            }
	          } catch (err) {
	            console.error("Import failed:", err);
            setImportSummary({
              rowsRead: 0,
              rowsUpserted: 0,
              docsCreated: 0,
              docsUpdated: 0,
              docsSkipped: 0,
              delimiter: "unknown",
              hasHeader: false,
              headers: [],
              errorCount: 1,
              firstError: String(err?.message || err),
              sourceName: sourceName || "pasted",
              mode,
            });
	            setSaveError(`Import failed: ${String(err?.message || err)}`);
	            return 0;
	          } finally {
	            if (guardId) window.clearTimeout(guardId);
	            setImportInProgress(false);
	            setImportStatus("");
	            setSaveWarning("");
	          }
	        };

	        const downloadCSV = () => {
	          if (!entriesRef) return;
	          const doExport = async (data) => {
            if (!data.length) return;
            const headers = ALL_COLUMNS.map((c) => c.name).join(",");
            const rows = data
              .map((entry) =>
                ALL_COLUMNS.map((col) => {
                  const cellData = entry[col.id] || "";
                  const escaped = String(cellData).replace(/"/g, '""').replace(/\n/g, " ");
                  return `"${escaped}"`;
                }).join(",")
              )
              .join("\n");
            const csvContent = `${headers}\n${rows}`;
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `case_notes_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };

          // If we only loaded a limited set, fetch everything on demand.
          entriesRef
            .orderBy("createdAt", "desc")
            .get()
            .then((snapshot) => doExport(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))))
            .catch((err) => {
              console.error("Export fetch error:", err);
              doExport(entries);
            });
        };

        // Import entries from CSV
        const importEntriesFromCsv = async (text, fileName) => {
          if (!entriesRef || !db) {
            showToast("Database not ready");
            return 0;
          }
          try {
            setImportInProgress(true);
            setImportStatus("Parsing CSV...");

            const lines = String(text).split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) {
              showToast("CSV must have headers and at least one data row");
              return 0;
            }

            const headerLine = lines[0].replace(/^\uFEFF/, "");
            const headers = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""));

            // Map header names to column IDs
            const headerToId = {};
            headers.forEach((h, i) => {
              const col = ALL_COLUMNS.find(c => c.name.toLowerCase() === h.toLowerCase());
              if (col) headerToId[i] = col.id;
            });

            let imported = 0;
            const batch = db.batch();

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              if (!line.trim()) continue;

              // Parse CSV line (handle quoted values)
              const values = [];
              let current = "";
              let inQuotes = false;
              for (const char of line) {
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === "," && !inQuotes) {
                  values.push(current.trim().replace(/^"|"$/g, ""));
                  current = "";
                } else {
                  current += char;
                }
              }
              values.push(current.trim().replace(/^"|"$/g, ""));

              const entry = { createdAt: firebase.firestore.FieldValue.serverTimestamp() };
              values.forEach((val, idx) => {
                const colId = headerToId[idx];
                if (colId && val) entry[colId] = val;
              });

              // Only import if we have essential fields
              if (entry.date || entry.family_name || entry.master_case) {
                const docRef = entriesRef.doc();
                batch.set(docRef, entry);
                imported++;
              }
            }

            if (imported > 0) {
              setImportStatus(`Saving ${imported} entries...`);
              await batch.commit();
              showToast(`Imported ${imported} case note${imported === 1 ? "" : "s"} from ${fileName}`);
            } else {
              showToast("No valid entries found in CSV");
            }

            return imported;
          } catch (err) {
            console.error("Entry import error:", err);
            showToast(`Import failed: ${err?.message || err}`);
            return 0;
          } finally {
            setImportInProgress(false);
            setImportStatus("");
          }
        };

        // Export profiles to CSV
        const downloadProfilesCSV = () => {
          if (!activeFamilyDirectoryOptions.length) {
            showToast("No profiles to export");
            return;
          }

          const headers = ["Family_ID", "Case_Name", "MC_Number", "CFSS", "Typical_Location",
            "Poverty_Level", "Household_Type",
            "Parent_1", "Parent_1_Gender", "Parent_1_Relationship", "Parent_1_Age_Range",
            "Parent_2", "Parent_2_Gender", "Parent_2_Relationship", "Parent_2_Age_Range",
            "Parent_3", "Parent_3_Gender", "Parent_3_Relationship", "Parent_3_Age_Range",
            "Head_of_Household",
            "Child_1", "Child_1_Gender", "Child_1_Age_Range",
            "Child_2", "Child_2_Gender", "Child_2_Age_Range",
            "Child_3", "Child_3_Gender", "Child_3_Age_Range",
            "Child_4", "Child_4_Gender", "Child_4_Age_Range",
            "Child_5", "Child_5_Gender", "Child_5_Age_Range",
            "Child_6", "Child_6_Gender", "Child_6_Age_Range",
            "Child_7", "Child_7_Gender", "Child_7_Age_Range",
            "Goal_1", "Goal_2", "Goal_3", "Goal_4", "Goal_5", "Goal_6"].join(",");

          const rows = activeFamilyDirectoryOptions.map(p => {
            const goals = (p.goalsText || "").split("\n").filter(g => g.trim());
            const r = p.raw || {};
            return [
              p.familyId || p.key || "",
              p.caseName || "",
              p.mcNumber || "",
              p.cfss || "",
              p.typicalLocation || "",
              r.Poverty_Level || "",
              r.Household_Type || "",
              p.parent1 || "", r.Parent_1_Gender || "", r.Parent_1_Relationship || "", r.Parent_1_Age_Range || "",
              p.parent2 || "", r.Parent_2_Gender || "", r.Parent_2_Relationship || "", r.Parent_2_Age_Range || "",
              p.parent3 || "", r.Parent_3_Gender || "", r.Parent_3_Relationship || "", r.Parent_3_Age_Range || "",
              r.Head_of_Household || "",
              p.child1 || "", r.Child_1_Gender || "", r.Child_1_Age_Range || "",
              p.child2 || "", r.Child_2_Gender || "", r.Child_2_Age_Range || "",
              p.child3 || "", r.Child_3_Gender || "", r.Child_3_Age_Range || "",
              p.child4 || "", r.Child_4_Gender || "", r.Child_4_Age_Range || "",
              p.child5 || "", r.Child_5_Gender || "", r.Child_5_Age_Range || "",
              p.child6 || "", r.Child_6_Gender || "", r.Child_6_Age_Range || "",
              p.child7 || "", r.Child_7_Gender || "", r.Child_7_Age_Range || "",
              goals[0] || "",
              goals[1] || "",
              goals[2] || "",
              goals[3] || "",
              goals[4] || "",
              goals[5] || "",
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
          }).join("\n");

          const csvContent = `${headers}\n${rows}`;
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `client_profiles_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(`Exported ${activeFamilyDirectoryOptions.length} profiles`);
        };

        // Export entries to CSV
        const exportEntriesToCsv = () => {
          if (!entries.length) {
            showToast("No entries to export");
            return;
          }

          const headers = ["id", "date", "service_type", "contact_type", "worker_name", "worker_credential",
            "family_name", "master_case", "location", "start_time", "end_time", "participants",
            "visit_narrative", "goals_progress",
            // Safety Assessment fields
            "safety_concern_present", "safety_concern_description", "safety_concern_addressed", "safety_notification", "safety_hotline_intake",
            "interventions", "plan",
            "interactions", "parenting_skills", "chain_of_custody",
            // DST-SP fields
            "patch_removed", "new_patch_applied", "client_willing_continue", "test_mailed", "sp_date_sent",
            "sp_test_result", "sp_client_admitted_use", "sp_non_admission_explanation", "sp_drugs_tested_positive", "sp_other_drug_specify", "sp_tampered_explanation",
            // DST-U/DST-MS fields
            "test_result", "client_admitted_use", "non_admission_explanation", "drugs_tested_positive", "other_drug_specify", "refusal_reason",
            // Legacy fields
            "safety_assessment", "client_admission", "engagement", "created_at"].join(",");

          const escapeCSV = (val) => {
            if (val == null) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
          };

          const rows = entries.map(e => [
            e.id || "",
            e.date || "",
            e.service_type || "",
            e.contact_type || "",
            e.worker_name || "",
            e.worker_credential || "",
            e.family_name || "",
            e.master_case || "",
            e.location || "",
            e.start_time || "",
            e.end_time || "",
            e.participants || "",
            e.visit_narrative || "",
            e.goals_progress || "",
            // Safety Assessment fields
            e.safety_concern_present || "",
            e.safety_concern_description || "",
            e.safety_concern_addressed || "",
            e.safety_notification || "",
            e.safety_hotline_intake || "",
            e.interventions || "",
            e.plan || "",
            e.interactions || "",
            e.parenting_skills || "",
            e.chain_of_custody || "",
            // DST-SP fields
            e.patch_removed || "",
            e.new_patch_applied || "",
            e.client_willing_continue || "",
            e.test_mailed || "",
            e.sp_date_sent || "",
            e.sp_test_result || "",
            e.sp_client_admitted_use || "",
            e.sp_non_admission_explanation || "",
            e.sp_drugs_tested_positive || "",
            e.sp_other_drug_specify || "",
            e.sp_tampered_explanation || "",
            // DST-U/DST-MS fields
            e.test_result || "",
            e.client_admitted_use || "",
            e.non_admission_explanation || "",
            e.drugs_tested_positive || "",
            e.other_drug_specify || "",
            e.refusal_reason || "",
            // Legacy fields
            e.safety_assessment || "",
            e.client_admission || "",
            e.engagement || "",
            e.created_at || "",
          ].map(escapeCSV).join(","));

          const csv = [headers, ...rows].join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `case_entries_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(`Exported ${entries.length} entries`);
        };

        // --- Shared PDF helper: converts an HTML string to a PDF Blob ---
        // Uses DOMParser to properly extract <style> and <body> from full HTML documents
        const htmlToPdfBlob = async (htmlString) => {
          const container = document.createElement("div");
          container.style.position = "absolute";
          container.style.left = "-9999px";
          container.style.top = "0";
          container.style.width = "8in";

          // Parse the full HTML doc to extract styles and body content
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, "text/html");

          // Extract all <style> tags and re-create them in the container
          const styles = doc.querySelectorAll("style");
          styles.forEach(s => {
            const styleEl = document.createElement("style");
            styleEl.textContent = s.textContent;
            container.appendChild(styleEl);
          });

          // Extract <link> tags (e.g. Google Fonts) and add them to the main document head
          const links = doc.querySelectorAll('link[rel="stylesheet"]');
          const addedLinks = [];
          links.forEach(l => {
            const linkEl = document.createElement("link");
            linkEl.rel = "stylesheet";
            linkEl.href = l.href;
            document.head.appendChild(linkEl);
            addedLinks.push(linkEl);
          });

          // Extract body content and append it
          const bodyContent = document.createElement("div");
          bodyContent.innerHTML = doc.body ? doc.body.innerHTML : htmlString;
          container.appendChild(bodyContent);

          document.body.appendChild(container);

          // Small delay to let fonts and styles load
          await new Promise(r => setTimeout(r, 200));

          try {
            const blob = await html2pdf()
              .set({
                margin: [0.4, 0.4, 0.4, 0.4],
                filename: "doc.pdf",
                image: { type: "jpeg", quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
                pagebreak: { mode: ["avoid-all", "css", "legacy"] },
              })
              .from(container)
              .outputPdf("blob");
            return blob;
          } finally {
            document.body.removeChild(container);
            // Clean up any links we added to <head>
            addedLinks.forEach(l => { try { document.head.removeChild(l); } catch (_) {} });
          }
        };

        // --- BATCH EXPORT: Case Notes as PDF files in ZIP ---
        // Grouped per client / per service / per month / per year
        const [batchExportLoading, setBatchExportLoading] = useState(false);
        const [batchExportProgress, setBatchExportProgress] = useState("");

        const batchExportCaseNotes = async () => {
          const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

          // Use already-loaded entries if available, otherwise fetch fresh
          let allEntries = [];
          setBatchExportLoading(true);
          setBatchExportProgress("Fetching all case notes...");

          try {
            if (entriesRef) {
              const snapshot = await entriesRef.get();
              allEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            } else {
              // Fallback to in-memory entries
              allEntries = [...entries];
            }

            allEntries = allEntries.filter(e => !e.is_archived && e.date);

            if (!allEntries.length) {
              showToast("No case notes to export");
              setBatchExportLoading(false);
              setBatchExportProgress("");
              return;
            }

            setBatchExportProgress(`Processing ${allEntries.length} entries...`);

            // Group entries by client + service + month + year
            const grouped = {};
            allEntries.forEach(entry => {
              const profile = familyDirectoryOptions.find(p => entryMatchesClient(entry, p.key));
              const clientKey = profile ? profile.key : (entry.family_name || entry.master_case || "Unknown");
              const familyName = profile ? profile.caseName : (entry.family_name || "Unknown");
              const mcNumber = profile ? profile.mcNumber : (entry.master_case || "");
              const svcType = entry.service_type || "General";

              const d = new Date(entry.date + "T00:00:00");
              if (isNaN(d.getTime())) return; // Skip entries with invalid dates
              const m = d.getMonth();
              const y = d.getFullYear();

              const groupKey = `${clientKey}|||${svcType}|||${m}|||${y}`;

              if (!grouped[groupKey]) {
                grouped[groupKey] = {
                  profile, familyName, mcNumber, serviceType: svcType,
                  month: m, year: y, entries: [],
                };
              }
              grouped[groupKey].entries.push(entry);
            });

            const zip = new JSZip();
            const groupKeys = Object.keys(grouped);

            if (!groupKeys.length) {
              showToast("No entries matched any grouping criteria");
              setBatchExportLoading(false);
              setBatchExportProgress("");
              return;
            }

            setBatchExportProgress(`Generating ${groupKeys.length} PDF files...`);

            for (let idx = 0; idx < groupKeys.length; idx++) {
              const gk = groupKeys[idx];
              const group = grouped[gk];
              group.entries.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

              const fileName = buildReportFileName({
                familyName: group.familyName,
                mcNumber: group.mcNumber,
                serviceTypes: group.serviceType,
                month: monthNames[group.month],
                year: String(group.year),
              });

              // Build the HTML for each case note entry
              const entriesHtml = group.entries.map(e => {
                const isCancelType = ["Cancelled by Parent","Cancelled by Worker","Cancelled for Weather","Cancelled by Team","Cancelled No Confirmation","Cancelled In Route"].includes(e.contact_type);
                const isDST = ["DST-U","DST-MS","DST-SP","DST-HF"].includes(e.service_type);

                let detailsHtml = "";

                if (isCancelType) {
                  detailsHtml += `<div class="field"><strong>Cancellation Type:</strong> ${e.contact_type || ""}</div>`;
                  if (e.weather_explanation) detailsHtml += `<div class="field"><strong>Weather Explanation:</strong> ${e.weather_explanation}</div>`;
                  if (e.cancellation_notification) detailsHtml += `<div class="field"><strong>Notification:</strong> ${e.cancellation_notification}</div>`;
                  if (e.cancellation_service_prep) detailsHtml += `<div class="field"><strong>Service Prep:</strong> ${e.cancellation_service_prep}</div>`;
                  if (e.cancellation_pre_call) detailsHtml += `<div class="field"><strong>Pre-Call:</strong> ${e.cancellation_pre_call}</div>`;
                  if (e.cancellation_en_route) detailsHtml += `<div class="field"><strong>En Route:</strong> ${e.cancellation_en_route}</div>`;
                } else if (isDST) {
                  detailsHtml += `<div class="field"><strong>Chain of Custody:</strong> ${e.chain_of_custody || "N/A"}</div>`;
                  if (e.service_type === "DST-SP") {
                    detailsHtml += `<div class="field"><strong>Patch Removed:</strong> ${e.patch_removed || "N/A"}</div>`;
                    detailsHtml += `<div class="field"><strong>New Patch Applied:</strong> ${e.new_patch_applied || "N/A"}</div>`;
                    detailsHtml += `<div class="field"><strong>Client Willing to Continue:</strong> ${e.client_willing_continue || "N/A"}</div>`;
                    detailsHtml += `<div class="field"><strong>Test Mailed:</strong> ${e.test_mailed || "N/A"}</div>`;
                    if (e.sp_date_sent) detailsHtml += `<div class="field"><strong>Date Sent:</strong> ${e.sp_date_sent}</div>`;
                    detailsHtml += `<div class="field"><strong>Test Result:</strong> ${e.sp_test_result || "Pending"}</div>`;
                    if (e.sp_test_result === "Positive") {
                      detailsHtml += `<div class="field"><strong>Client Admitted:</strong> ${e.sp_client_admitted_use || "N/A"}</div>`;
                      if (e.sp_non_admission_explanation) detailsHtml += `<div class="field"><strong>Explanation:</strong> ${e.sp_non_admission_explanation}</div>`;
                      if (e.sp_drugs_tested_positive) detailsHtml += `<div class="field"><strong>Drugs Positive:</strong> ${e.sp_drugs_tested_positive}</div>`;
                      if (e.sp_other_drug_specify) detailsHtml += `<div class="field"><strong>Other Drug:</strong> ${e.sp_other_drug_specify}</div>`;
                    }
                    if (e.sp_test_result === "Tampered" && e.sp_tampered_explanation) {
                      detailsHtml += `<div class="field"><strong>Tampered:</strong> ${e.sp_tampered_explanation}</div>`;
                    }
                  } else {
                    detailsHtml += `<div class="field"><strong>Test Result:</strong> ${e.test_result || "N/A"}</div>`;
                    if (e.test_result === "Positive") {
                      detailsHtml += `<div class="field"><strong>Client Admitted:</strong> ${e.client_admitted_use || "N/A"}</div>`;
                      if (e.non_admission_explanation) detailsHtml += `<div class="field"><strong>Explanation:</strong> ${e.non_admission_explanation}</div>`;
                      if (e.drugs_tested_positive) detailsHtml += `<div class="field"><strong>Drugs Positive:</strong> ${e.drugs_tested_positive}</div>`;
                      if (e.other_drug_specify) detailsHtml += `<div class="field"><strong>Other Drug:</strong> ${e.other_drug_specify}</div>`;
                    }
                    if (e.test_result === "Refusal" && e.refusal_reason) {
                      detailsHtml += `<div class="field"><strong>Refusal Reason:</strong> ${e.refusal_reason}</div>`;
                    }
                  }
                  if (e.sent_to_lab === "Yes") detailsHtml += `<div class="field"><strong>Sent to Lab:</strong> Yes</div>`;
                  if (e.lab_result_text) detailsHtml += `<div class="field"><strong>Lab Results:</strong> ${e.lab_result_text}</div>`;
                  if (e.visit_narrative) detailsHtml += `<div class="narrative"><strong>Narrative:</strong><br>${e.visit_narrative}</div>`;
                } else {
                  if (e.participants) detailsHtml += `<div class="field"><strong>Participants:</strong> ${e.participants}</div>`;
                  if (e.visit_narrative) detailsHtml += `<div class="narrative"><strong>Narrative:</strong><br>${e.visit_narrative}</div>`;
                  if (e.goals_progress) detailsHtml += `<div class="narrative"><strong>Goals Progress:</strong><br>${e.goals_progress}</div>`;
                  if (e.safety_concern_present === "Yes") {
                    detailsHtml += `<div class="field safety"><strong>Safety Concern:</strong> ${e.safety_concern_description || "Yes"}</div>`;
                    if (e.safety_concern_addressed) detailsHtml += `<div class="field"><strong>Addressed:</strong> ${e.safety_concern_addressed}</div>`;
                    if (e.safety_notification) detailsHtml += `<div class="field"><strong>Notified:</strong> ${e.safety_notification}</div>`;
                    if (e.safety_hotline_intake) detailsHtml += `<div class="field"><strong>Hotline Intake #:</strong> ${e.safety_hotline_intake}</div>`;
                  } else {
                    detailsHtml += `<div class="field"><strong>Safety:</strong> No concerns identified</div>`;
                  }
                  if (e.interventions) detailsHtml += `<div class="narrative"><strong>Interventions:</strong><br>${e.interventions}</div>`;
                  if (e.plan) detailsHtml += `<div class="narrative"><strong>Plan:</strong><br>${e.plan}</div>`;
                  if (e.interactions) detailsHtml += `<div class="narrative"><strong>Interactions:</strong><br>${e.interactions}</div>`;
                  if (e.parenting_skills) detailsHtml += `<div class="narrative"><strong>Parenting Skills:</strong><br>${e.parenting_skills}</div>`;
                }

                return `
                  <div class="entry">
                    <div class="entry-header">
                      <span><strong>Date:</strong> ${e.date || "N/A"}</span>
                      <span><strong>Start Time:</strong> ${formatTime12h(e.start_time) || "N/A"}</span>
                      <span><strong>End Time:</strong> ${formatTime12h(e.end_time) || "N/A"}</span>
                      <span><strong>Contact:</strong> ${e.contact_type || "N/A"}</span>
                      <span><strong>Location:</strong> ${e.location || "N/A"}</span>
                    </div>
                    <div class="entry-worker">Worker: ${e.worker_name || "N/A"}${e.worker_credential ? ` (${e.worker_credential})` : ""}</div>
                    <div class="entry-body">${detailsHtml}</div>
                  </div>`;
              }).join("\n");

              const html = `<!DOCTYPE html>
<html><head>
<title>${fileName}</title>
<style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; padding: 0.25in; }
  .doc-header { text-align: center; border-bottom: 3px solid #1E3A5F; padding-bottom: 12px; margin-bottom: 16px; }
  .doc-header h1 { font-size: 14pt; color: #1E3A5F; margin-bottom: 4px; }
  .doc-header .meta { font-size: 9pt; color: #666; }
  .info-grid { display: flex; gap: 20px; margin-bottom: 16px; padding: 10px; background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 4px; flex-wrap: wrap; }
  .info-grid div { font-size: 9pt; }
  .info-grid strong { color: #1E3A5F; }
  .entry { border: 1px solid #ddd; margin-bottom: 12px; page-break-inside: avoid; border-radius: 4px; }
  .entry-header { background: #f5f5f5; padding: 6px 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 9pt; }
  .entry-worker { padding: 4px 10px; font-size: 8pt; color: #666; border-bottom: 1px solid #eee; }
  .entry-body { padding: 10px; }
  .field { font-size: 9pt; margin-bottom: 4px; }
  .narrative { font-size: 9pt; margin-bottom: 8px; white-space: pre-wrap; line-height: 1.5; }
  .safety { color: #b91c1c; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8pt; color: #666; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <div class="doc-header">
    <h1>CASE NOTES — ${(group.serviceType || "").toUpperCase()}</h1>
    <div class="meta">Epworth Village Family Resources | ${monthNames[group.month]} ${group.year}</div>
  </div>
  <div class="info-grid">
    <div><strong>Family:</strong> ${group.familyName}</div>
    <div><strong>MC#:</strong> ${group.mcNumber || "N/A"}</div>
    <div><strong>Service:</strong> ${group.serviceType}</div>
    <div><strong>Month:</strong> ${monthNames[group.month]} ${group.year}</div>
    <div><strong>Total Notes:</strong> ${group.entries.length}</div>
  </div>
  ${entriesHtml}
  <div class="footer">Epworth Village Family Resources | Confidential Document | ${monthNames[group.month]} ${group.year}</div>
</body></html>`;

              // Convert HTML to PDF and add to ZIP
              const folderName = (group.familyName || "Unknown").replace(/[/\\:*?"<>|]/g, "");
              setBatchExportProgress(`Generating PDF ${idx + 1} of ${groupKeys.length}...`);
              try {
                const pdfBlob = await htmlToPdfBlob(html);
                zip.file(`${folderName}/${fileName}.pdf`, pdfBlob);
              } catch (pdfErr) {
                console.warn(`PDF generation failed for ${fileName}, skipping:`, pdfErr);
              }
            }

            setBatchExportProgress("Creating ZIP...");
            const blob = await zip.generateAsync({ type: "blob" });
            saveAs(blob, `Epworth_CaseNotes_BatchExport_${new Date().toISOString().slice(0, 10)}.zip`);
            showToast(`Exported ${groupKeys.length} PDF files across ${new Set(groupKeys.map(k => k.split("|||")[0])).size} clients`);
          } catch (err) {
            console.error("Batch export error:", err);
            showToast("Batch export failed: " + (err.message || String(err)));
          } finally {
            setBatchExportLoading(false);
            setBatchExportProgress("");
          }
        };

        // --- BATCH EXPORT: Monthly Reports as PDF files in ZIP ---
        const [batchReportLoading, setBatchReportLoading] = useState(false);
        const [batchReportProgress, setBatchReportProgress] = useState("");

        const batchExportMonthlyReports = async () => {
          if (!entriesRef) return;
          setBatchReportLoading(true);
          setBatchReportProgress("Fetching all case notes...");

          try {
            const snapshot = await entriesRef.orderBy("createdAt", "desc").get();
            const allEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => !e.is_archived);

            if (!allEntries.length) {
              showToast("No entries to generate reports from");
              setBatchReportLoading(false);
              setBatchReportProgress("");
              return;
            }

            const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
            const providerPrefix = "The Family Life Specialist from Epworth Family Resources";

            // Map of reportType keys to service type arrays
            const reportTypeServiceMap = {
              family_support: ["OHFS/IHFS", "OHFS", "IHFS"],
              ptsv: ["PTSV", "PTSV-C"],
              drug_testing: ["DST-SP", "DST-U", "DST-MS", "DST-HF"],
            };

            // Group entries by client + service category + month/year
            const grouped = {};
            const activeProfiles = familyDirectoryOptions.filter(p => !p.isArchived);

            activeProfiles.forEach(profile => {
              // Find all entries for this profile
              const profileEntries = allEntries.filter(e => entryMatchesClient(e, profile.key));

              profileEntries.forEach(entry => {
                if (!entry.date) return;
                const d = new Date(entry.date + "T00:00:00");
                const m = d.getMonth();
                const y = d.getFullYear();
                const svcType = String(entry.service_type || "").toUpperCase();

                // Determine report type category
                let reportCategory = null;
                for (const [cat, svcTypes] of Object.entries(reportTypeServiceMap)) {
                  if (svcTypes.includes(svcType)) {
                    reportCategory = cat;
                    break;
                  }
                }
                if (!reportCategory) return;

                const groupKey = `${profile.key}|||${reportCategory}|||${m}|||${y}`;
                if (!grouped[groupKey]) {
                  grouped[groupKey] = {
                    profile, reportCategory, month: m, year: y,
                    entries: [],
                  };
                }
                grouped[groupKey].entries.push(entry);
              });
            });

            const zip = new JSZip();
            const groupKeys = Object.keys(grouped);
            setBatchReportProgress(`Generating ${groupKeys.length} monthly report PDFs...`);

            for (let idx = 0; idx < groupKeys.length; idx++) {
              const gk = groupKeys[idx];
              const group = grouped[gk];
              const { profile, reportCategory, month: m, year: y } = group;
              const filteredEntries = group.entries.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

              // Calculate session log & stats
              const sessionLog = filteredEntries.map(e => {
                const startTime = e.start_time || "";
                const endTime = e.end_time || "";
                let duration = 0;
                if (startTime && endTime) {
                  const [sh, sm] = startTime.split(":").map(Number);
                  const [eh, em] = endTime.split(":").map(Number);
                  if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
                    duration = Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
                  }
                }
                const contactType = String(e?.contact_type || "").trim();
                const isCancelled = ["Cancelled by Parent","Cancelled by Worker","Cancelled for Weather","Cancelled by Team","Cancelled No Confirmation","Cancelled In Route"].includes(contactType);
                const isNoShow = contactType === "No Show" || contactType === "No-Show";
                const status = isCancelled ? "Cancelled" : isNoShow ? "No-Show" : "Completed";

                return {
                  date: e.date || "", type: e.service_type || "", location: e.location || "",
                  time: startTime && endTime ? `${startTime}-${endTime}` : "",
                  duration: duration.toFixed(1), status, description: e.visit_narrative || e.session_narrative || "",
                  notes: e.plan || "",
                  testType: e.service_type?.replace("DST-", "") || "",
                  testStatus: e.test_result === "Positive" ? "P" : e.test_result === "Refusal" ? "R" : contactType === "No Show" ? "NS" : e.client_admitted_use === "Yes" ? "A" : "C",
                  testResult: e.test_result || (e.client_admitted_use === "Yes" ? "Admission" : ""),
                };
              });

              const completedSessions = sessionLog.filter(s => s.status === "Completed");
              const totalHours = completedSessions.reduce((sum, s) => sum + parseFloat(s.duration || 0), 0);
              const noShows = sessionLog.filter(s => s.status === "No-Show").length;
              const cancellations = sessionLog.filter(s => s.status === "Cancelled").length;
              const workerName = filteredEntries[0]?.worker_name || "";

              // Goals from profile
              const goals = (profile.goals || []).map(g => typeof g === "string" ? g : String(g?.text || "")).filter(Boolean);

              // Safety assessment
              const safetyConcerns = filteredEntries.filter(e => e.safety_concern_present === "Yes");
              const safetyText = safetyConcerns.length === 0
                ? `${providerPrefix} assessed child safety during each contact. No safety concerns were identified during the reporting period.`
                : `${providerPrefix} documented safety concerns during this period. ${safetyConcerns.map(e => `${e.safety_concern_description || "Safety concern noted"}. Addressed: ${e.safety_concern_addressed || "See notes"}.`).join(" ")}`;

              // Narratives for summary
              const allNarratives = filteredEntries.filter(e => e.visit_narrative || e.session_narrative).map(e => e.visit_narrative || e.session_narrative);
              const narrativeSummary = allNarratives.slice(0, 3).join(" ") || "";

              // Family members
              const familyMembers = [];
              if (profile.raw?.Parent_1) familyMembers.push(profile.raw.Parent_1);
              if (profile.raw?.Parent_2) familyMembers.push(profile.raw.Parent_2);
              for (let i = 1; i <= 7; i++) { if (profile.raw?.[`Child_${i}`]) familyMembers.push(profile.raw[`Child_${i}`]); }

              // Service label
              const serviceLabel = reportCategory === "family_support" ? "Family Support"
                : reportCategory === "ptsv" ? "PTSV" : "Drug Testing";
              const reportTitle = reportCategory === "family_support"
                ? "FAMILY SUPPORT SERVICE – MONTHLY SUMMARY REPORT"
                : reportCategory === "ptsv"
                ? "PARENTING TIME / SUPERVISED VISITATION – MONTHLY SUMMARY REPORT"
                : "DRUG TESTING SPECIMEN COLLECTION – MONTHLY CONTACT LOG / SUMMARY REPORT";

              // Build filename
              const fileName = buildReportFileName({
                familyName: profile.caseName,
                mcNumber: profile.mcNumber,
                serviceTypes: serviceLabel,
                month: monthNames[m],
                year: String(y),
              });

              // Session log table rows
              const sessionTableRows = reportCategory === "drug_testing"
                ? sessionLog.map(s => `<tr><td>${s.date}</td><td>${s.time}</td><td>${s.testType || s.type}</td><td>${s.testStatus}</td><td>${s.testResult || ""}</td></tr>`).join("")
                : sessionLog.map(s => `<tr><td>${s.date}</td><td>${s.location}</td><td>${s.duration} hrs</td><td>${s.status}</td></tr>`).join("");

              const sessionTableHeaders = reportCategory === "drug_testing"
                ? "<tr><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Result</th></tr>"
                : "<tr><th>Date</th><th>Location</th><th>Duration</th><th>Status</th></tr>";

              // Narratives section
              const narrativesHtml = sessionLog.filter(s => s.description && s.status === "Completed").map(s => `
                <div style="border: 1px solid #ddd; margin-bottom: 12px; page-break-inside: avoid; border-radius: 4px;">
                  <div style="background: #f5f5f5; padding: 6px 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 9pt;">
                    <span><strong>Date:</strong> ${s.date}</span>
                    <span><strong>${reportCategory === "drug_testing" ? "Type" : "Location"}:</strong> ${reportCategory === "drug_testing" ? (s.testType || s.type) : s.location}</span>
                    <span><strong>Duration:</strong> ${s.duration} hrs</span>
                  </div>
                  <div style="padding: 10px; font-size: 9pt; line-height: 1.5; white-space: pre-wrap;">${s.description}</div>
                </div>`).join("");

              // Drug testing specific summary
              let drugSummaryHtml = "";
              if (reportCategory === "drug_testing") {
                const collected = filteredEntries.filter(e => e.chain_of_custody === "Yes").length;
                const refusals = filteredEntries.filter(e => e.test_result === "Refusal").length;
                const admissions = filteredEntries.filter(e => e.client_admitted_use === "Yes").length;
                drugSummaryHtml = `
                  <div class="section">
                    <div class="section-title">Collection Summary</div>
                    <table><thead><tr><th>Category</th><th>Count</th></tr></thead><tbody>
                      <tr><td>Successful Collections</td><td>${collected}</td></tr>
                      <tr><td>No-Shows</td><td>${noShows}</td></tr>
                      <tr><td>Refusals</td><td>${refusals}</td></tr>
                      <tr><td>Admissions</td><td>${admissions}</td></tr>
                      <tr><td>Cancellations</td><td>${cancellations}</td></tr>
                    </tbody></table>
                  </div>`;
              }

              // Goals section
              const goalsHtml = goals.length > 0 ? `
                <div class="section">
                  <div class="section-title">Goals</div>
                  <ol style="margin: 6px 0 6px 18px; padding: 0; font-size: 9pt;">${goals.map(g => `<li>${g}</li>`).join("")}</ol>
                </div>` : "";

              const html = `<!DOCTYPE html>
<html><head>
<title>${fileName}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">
<style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; padding: 0.25in; }
  .header { text-align: center; border-bottom: 3px solid #1E3A5F; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 14pt; font-weight: bold; color: #1E3A5F; margin-bottom: 4px; }
  .header .subtitle { font-size: 9pt; color: #666; }
  .section { margin-bottom: 12px; page-break-inside: avoid; }
  .section-title { background: #1E3A5F; color: white; padding: 4px 8px; font-weight: bold; font-size: 9pt; text-transform: uppercase; margin-bottom: 6px; }
  .field-row { display: flex; border-bottom: 1px solid #ddd; padding: 4px 0; }
  .field-label { font-weight: bold; width: 180px; flex-shrink: 0; font-size: 9pt; }
  .field-value { flex: 1; font-size: 9pt; }
  .two-col { display: flex; gap: 20px; }
  .two-col > div { flex: 1; }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 4px; }
  th { background: #f0f0f0; border: 1px solid #999; padding: 4px; text-align: left; font-weight: bold; }
  td { border: 1px solid #999; padding: 4px; vertical-align: top; }
  .narrative { border: 1px solid #ddd; padding: 8px; min-height: 40px; background: #fafafa; font-size: 9pt; white-space: pre-wrap; }
  .checkbox-row { display: flex; gap: 20px; padding: 6px 0; }
  .checkbox-item { display: flex; align-items: center; gap: 4px; }
  .checkbox { width: 12px; height: 12px; border: 1px solid #000; display: inline-block; }
  .checkbox.checked::after { content: "\\2713"; font-size: 10px; font-weight: bold; }
  .signature-section { margin-top: 20px; display: flex; gap: 40px; }
  .signature-line { flex: 1; border-top: 1px solid #000; padding-top: 4px; font-size: 9pt; }
  .signature-name { font-family: 'Dancing Script', cursive; font-size: 18pt; font-weight: 600; color: #1a365d; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8pt; color: #666; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <div class="header">
    <h1>${reportTitle}</h1>
    <div class="subtitle">Due: 10th calendar day of the month following service</div>
  </div>

  <div class="section">
    <div class="section-title">Provider & Report Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Provider Agency:</span><span class="field-value">Epworth Village</span></div>
        <div class="field-row"><span class="field-label">Report Month/Year:</span><span class="field-value">${monthNames[m]} ${y}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">Worker:</span><span class="field-value">${workerName}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Client Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Family Name:</span><span class="field-value">${profile.caseName || ""}</span></div>
        <div class="field-row"><span class="field-label">Family Members:</span><span class="field-value">${familyMembers.join(", ")}</span></div>
        <div class="field-row"><span class="field-label">Reporting Period:</span><span class="field-value">${filteredEntries[0]?.date || ""} to ${filteredEntries[filteredEntries.length - 1]?.date || ""}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">MC#:</span><span class="field-value">${profile.mcNumber || ""}</span></div>
        <div class="field-row"><span class="field-label">CFSS:</span><span class="field-value">${profile.cfss || ""}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Service Hours</div>
    <div class="two-col">
      <div class="field-row"><span class="field-label">Hours Completed:</span><span class="field-value">${totalHours.toFixed(1)}</span></div>
      <div class="field-row"><span class="field-label">Sessions Completed:</span><span class="field-value">${completedSessions.length}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${reportCategory === "drug_testing" ? "Specimen Collection Log" : "Session Log"}</div>
    <table><thead>${sessionTableHeaders}</thead><tbody>
      ${sessionTableRows || '<tr><td colspan="4" style="text-align:center;color:#999;">No entries</td></tr>'}
    </tbody></table>
  </div>

  ${drugSummaryHtml}

  <div class="section" style="page-break-before: always;">
    <div class="section-title">${reportCategory === "drug_testing" ? "Contact Narratives" : "Case Note Narratives"}</div>
    ${narrativesHtml || '<div style="padding: 8px; color: #999; text-align: center;">No narratives available</div>'}
  </div>

  <div class="section">
    <div class="section-title">Session Exceptions</div>
    <div class="two-col">
      <div><div class="field-row"><span class="field-label">No-Shows:</span><span class="field-value">${noShows}</span></div></div>
      <div><div class="field-row"><span class="field-label">Cancellations:</span><span class="field-value">${cancellations}</span></div></div>
    </div>
  </div>

  ${goalsHtml}

  <div class="section">
    <div class="section-title">Child Safety Assessment</div>
    <div class="narrative">${safetyText}</div>
    <div class="checkbox-row" style="margin-top: 8px;">
      <span class="field-label">Safety Concerns:</span>
      <span class="checkbox-item"><span class="checkbox ${safetyConcerns.length === 0 ? "checked" : ""}"></span> None</span>
      <span class="checkbox-item"><span class="checkbox ${safetyConcerns.length > 0 ? "checked" : ""}"></span> Documented</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary</div>
    <div class="narrative">${narrativeSummary || `${providerPrefix} supported the family through scheduled contacts and reinforced progress toward case plan goals.`}</div>
  </div>

  <div class="signature-section">
    <div class="signature-line"><span class="signature-name">${workerName}</span><br><span style="font-size: 8pt; color: #666;">Worker Signature</span></div>
    <div class="signature-line">${new Date().toLocaleDateString()}<br><span style="font-size: 8pt; color: #666;">Date</span></div>
  </div>
  <div class="signature-section" style="margin-top: 16px;">
    <div class="signature-line"><span class="signature-name">Brandon Hinrichs</span><br><span style="font-size: 8pt; color: #666;">IHS Director</span></div>
    <div class="signature-line">${new Date().toLocaleDateString()}<br><span style="font-size: 8pt; color: #666;">Date</span></div>
  </div>

  <div class="footer">Epworth Village Family Resources | Confidential Document | ${monthNames[m]} ${y}</div>
</body></html>`;

              // Convert HTML to PDF and organize into folders by client name
              const folderName = `${(profile.caseName || "Unknown").replace(/[/\\:*?"<>|]/g, "")}`;
              setBatchReportProgress(`Generating PDF ${idx + 1} of ${groupKeys.length}...`);
              try {
                const pdfBlob = await htmlToPdfBlob(html);
                zip.file(`${folderName}/${fileName}.pdf`, pdfBlob);
              } catch (pdfErr) {
                console.warn(`PDF generation failed for ${fileName}, skipping:`, pdfErr);
              }
            }

            if (groupKeys.length === 0) {
              showToast("No entries matched any active clients with recognized service types");
              setBatchReportLoading(false);
              setBatchReportProgress("");
              return;
            }

            setBatchReportProgress("Creating ZIP...");
            const blob = await zip.generateAsync({ type: "blob" });
            saveAs(blob, `Epworth_MonthlyReports_BatchExport_${new Date().toISOString().slice(0, 10)}.zip`);
            showToast(`Exported ${groupKeys.length} monthly report PDFs`);
          } catch (err) {
            console.error("Batch report export error:", err);
            showToast("Batch export failed: " + (err.message || err));
          } finally {
            setBatchReportLoading(false);
            setBatchReportProgress("");
          }
        };

			        const generateNoteText = (entry) => {
			          let note = `SERVICE NOTE: ${entry.service_type || "General"}\n`;
			          if (entry.worker_name || entry.worker_credential) {
			            note += `Worker: ${entry.worker_name || "N/A"}${entry.worker_credential ? ` (${entry.worker_credential})` : ""}\n`;
			          }
			          note += `Date: ${entry.date || "N/A"} | Time: ${formatTime12h(entry.start_time) || ""} - ${formatTime12h(entry.end_time) || ""}\n`;
			          note += `Contact: ${entry.contact_type || "N/A"} | Location: ${entry.location || "N/A"}\n`;
			          note += `Family: ${entry.family_name || "N/A"} (Case: ${entry.master_case || "N/A"})\n`;
			          note += `----------------------------------------\n`;
		
		          const specificFields = SERVICE_CONFIGS[entry.service_type] || SERVICE_CONFIGS.default;

		          const isCancelType = ["Cancelled by Parent", "Cancelled by Worker", "Cancelled for Weather", "Cancelled by Team", "Cancelled No Confirmation", "Cancelled In Route"].includes(entry.contact_type);
		          if (!isCancelType && entry.goals_progress) {
		            const cleaned = stripGoalsMarker(entry.goals_progress);
		            if (cleaned) note += `GOALS:\n${cleaned}\n\n`;
		          }

		          if (isCancelType) {
		            note += `CANCELLATION / NO-SHOW DOCUMENTATION:\n`;
		            if (entry.weather_explanation) note += `WEATHER EXPLANATION:\n${entry.weather_explanation}\n\n`;
		            if (entry.cancellation_notification) note += `NOTIFICATION:\n${entry.cancellation_notification}\n\n`;
		            if (entry.cancellation_service_prep) note += `SERVICE PREP:\n${entry.cancellation_service_prep}\n\n`;
		            if (entry.cancellation_pre_call) note += `PRE-CALL:\n${entry.cancellation_pre_call}\n\n`;
		            if (entry.cancellation_en_route) note += `EN ROUTE:\n${entry.cancellation_en_route}\n\n`;
		          }
		          // Drug Testing specific output
		          if (isDrugTestingService(entry.service_type)) {
		            note += `CHAIN OF CUSTODY FOLLOWED: ${entry.chain_of_custody || "N/A"}\n\n`;

		            if (entry.service_type === "DST-SP") {
		              // Sweat Patch specific fields
		              note += `SWEAT PATCH DOCUMENTATION:\n`;
		              note += `Patch Removed: ${entry.patch_removed || "N/A"}\n`;
		              note += `New Patch Applied: ${entry.new_patch_applied || "N/A"}\n`;
		              note += `Client Willing to Continue: ${entry.client_willing_continue || "N/A"}\n`;
		              note += `Test Mailed for Confirmation: ${entry.test_mailed || "N/A"}\n`;
		              if (entry.sp_date_sent) note += `Date Test Sent: ${entry.sp_date_sent}\n`;
		              note += `\n`;
		              // Sweat Patch Results
		              note += `SWEAT PATCH RESULT: ${entry.sp_test_result || "Pending"}\n`;
		              if (entry.sp_test_result === "Positive") {
		                note += `POSITIVE RESULT DOCUMENTATION:\n`;
		                note += `Client Admitted to Using: ${entry.sp_client_admitted_use || "N/A"}\n`;
		                if (entry.sp_client_admitted_use === "No" && entry.sp_non_admission_explanation) {
		                  note += `Non-Admission Explanation: ${entry.sp_non_admission_explanation}\n`;
		                }
		                if (entry.sp_drugs_tested_positive) {
		                  note += `Drugs Tested Positive For: ${entry.sp_drugs_tested_positive}\n`;
		                }
		                if (entry.sp_other_drug_specify) {
		                  note += `Other Drug(s): ${entry.sp_other_drug_specify}\n`;
		                }
		              }
		              if (entry.sp_test_result === "Tampered") {
		                note += `TAMPERED DOCUMENTATION (Counts as Positive):\n`;
		                if (entry.sp_tampered_explanation) {
		                  note += `Tampered Circumstances: ${entry.sp_tampered_explanation}\n`;
		                }
		              }
		              note += `\n`;
		            } else if (isUAorMS(entry.service_type)) {
		              // UA or Mouth Swab specific fields
		              note += `TEST RESULT: ${entry.test_result || "N/A"}\n\n`;

		              if (entry.test_result === "Positive") {
		                note += `POSITIVE RESULT DOCUMENTATION:\n`;
		                note += `Client Admitted to Using: ${entry.client_admitted_use || "N/A"}\n`;
		                if (entry.client_admitted_use === "No" && entry.non_admission_explanation) {
		                  note += `Non-Admission Explanation: ${entry.non_admission_explanation}\n`;
		                }
		                if (entry.drugs_tested_positive) {
		                  note += `Drugs Tested Positive For: ${entry.drugs_tested_positive}\n`;
		                }
		                if (entry.other_drug_specify) {
		                  note += `Other Drug(s): ${entry.other_drug_specify}\n`;
		                }
		                note += `\n`;
		              } else if (entry.test_result === "Refusal") {
		                note += `REFUSAL DOCUMENTATION (Counts as Positive):\n`;
		                if (entry.refusal_reason) {
		                  note += `Reason/Circumstances: ${entry.refusal_reason}\n`;
		                }
		                note += `\n`;
		              }
		            }

		            // Lab submission info (all drug testing types)
		            if (entry.lab_result_text) {
		              note += `LAB RESULTS:\n${entry.lab_result_text}\n\n`;
		            } else if (entry.sent_to_lab === "Yes") {
		              note += `LAB SUBMISSION: Specimen sent to lab — results pending.\n\n`;
		            }
		            if (entry.sent_to_lab === "No" && entry.not_sent_to_lab_reason) {
		              note += `NOT SENT TO LAB - REASON:\n${entry.not_sent_to_lab_reason}\n\n`;
		            }
		          } else {
		            // Standard field rendering for non-drug testing services
		            specificFields.forEach((fieldId) => {
		              if (fieldId === "goals_progress") return;

		              // Handle Safety Assessment specially
		              if (fieldId === "safety_concern_present") {
		                note += `SAFETY ASSESSMENT:\n`;
		                if (entry.safety_concern_present === "No" || !entry.safety_concern_present) {
		                  note += `No safety concerns identified.\n\n`;
		                } else if (entry.safety_concern_present === "Yes") {
		                  note += `Safety Concern Present: Yes\n`;
		                  if (entry.safety_concern_description) {
		                    note += `Concern: ${entry.safety_concern_description}\n`;
		                  }
		                  if (entry.safety_concern_addressed) {
		                    note += `How Addressed: ${entry.safety_concern_addressed}\n`;
		                  }
		                  if (entry.safety_notification) {
		                    note += `Notified: ${entry.safety_notification}\n`;
		                  }
		                  if (entry.safety_hotline_intake) {
		                    note += `HHS Hotline Intake #: ${entry.safety_hotline_intake}\n`;
		                  }
		                  note += `\n`;
		                }
		                return;
		              }

		              const fieldConfig = ALL_COLUMNS.find((c) => c.id === fieldId);
		              if (fieldConfig && entry[fieldId]) {
			                const label =
			                  fieldId === "visit_narrative" && entry.contact_type === "Monitored Visit"
			                    ? "Drop-ins"
			                    : fieldId === "visit_narrative" && entry.contact_type === "Phone Call"
			                      ? "Phone Call Narrative"
			                      : fieldId === "visit_narrative" && entry.contact_type === "Text Message"
			                        ? "Text Message Narrative"
			                        : fieldConfig.name;
			                note += `${label.toUpperCase()}:\n${entry[fieldId]}\n\n`;
		              }
		            });
		          }
		          return note;
		        };

        const copyToClipboard = (text) => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand("copy");
            } catch (err) {
              console.error("Fallback copy failed", err);
            }
            document.body.removeChild(textArea);
          }
        };

        // --- Non-Billable Contacts View ---
        const NonBillableContactsView = () => {
          const [localFormData, setLocalFormData] = useState({
            date: new Date().toISOString().split("T")[0],
            time: new Date().toTimeString().slice(0, 5),
            worker_name: "",
            worker_credential: "",
            family_name: "",
            family_directory_key: "",
            narrative: "",
            contacted_parties: []
          });
          const [localEditingId, setLocalEditingId] = useState("");
          const [saving, setSaving] = useState(false);

          const resetContactForm = () => {
            setLocalFormData({
              date: new Date().toISOString().split("T")[0],
              time: new Date().toTimeString().slice(0, 5),
              worker_name: "",
              worker_credential: "",
              family_name: "",
              family_directory_key: "",
              narrative: "",
              contacted_parties: []
            });
            setLocalEditingId("");
          };

          const handlePartyToggle = (party) => {
            setLocalFormData(prev => ({
              ...prev,
              contacted_parties: prev.contacted_parties.includes(party)
                ? prev.contacted_parties.filter(p => p !== party)
                : [...prev.contacted_parties, party]
            }));
          };

          const saveContact = async () => {
            if (!localFormData.date || !localFormData.family_name || !localFormData.narrative) {
              alert("Please fill in date, family name, and narrative.");
              return;
            }
            if (localFormData.contacted_parties.length === 0) {
              alert("Please select at least one contacted party.");
              return;
            }
            setSaving(true);
            try {
              const contactData = {
                ...localFormData,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: user?.email || "unknown"
              };
              if (localEditingId) {
                await nonBillableContactsRef.doc(localEditingId).update(contactData);
                showToast("Contact updated!");
                await logAuditEvent("updated", "contact", {
                  contact_id: localEditingId,
                  family_name: localFormData.family_name,
                  contacted_parties: localFormData.contacted_parties,
                });
              } else {
                contactData.created_at = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await nonBillableContactsRef.add(contactData);
                showToast("Contact saved!");
                await logAuditEvent("created", "contact", {
                  contact_id: docRef.id,
                  family_name: localFormData.family_name,
                  contacted_parties: localFormData.contacted_parties,
                });
              }
              resetContactForm();
            } catch (err) {
              console.error("Error saving contact:", err);
              alert("Failed to save contact: " + err.message);
            } finally {
              setSaving(false);
            }
          };

          const editContact = (contact) => {
            setLocalFormData({
              date: contact.date || "",
              time: contact.time || "",
              worker_name: contact.worker_name || "",
              worker_credential: contact.worker_credential || "",
              family_name: contact.family_name || "",
              family_directory_key: contact.family_directory_key || "",
              narrative: contact.narrative || "",
              contacted_parties: contact.contacted_parties || []
            });
            setLocalEditingId(contact.id);
          };

          const deleteContact = async (contactId) => {
            if (!window.confirm("Are you sure you want to delete this contact log?")) return;
            try {
              // Get contact details before deleting for audit log
              const contactToDelete = nonBillableContacts.find(c => c.id === contactId);
              await nonBillableContactsRef.doc(contactId).delete();
              showToast("Contact deleted!");
              await logAuditEvent("deleted", "contact", {
                contact_id: contactId,
                family_name: contactToDelete?.family_name || "unknown",
              });
              if (localEditingId === contactId) resetContactForm();
            } catch (err) {
              console.error("Error deleting contact:", err);
              alert("Failed to delete: " + err.message);
            }
          };

          // Get active family profiles for dropdown (same as FormView)
          const activeFamilyProfiles = useMemo(() => {
            return familyDirectoryOptions.filter(o => !o.isArchived);
          }, [familyDirectoryOptions]);

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <LucideIcon name="Phone" className="w-7 h-7" />
                  Non-Billable Contacts
                </h2>
                <p className="text-white/80 text-sm mt-1">Log contacts with attorneys, case workers, and other HHS parties</p>
              </div>

              {/* Form */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <LucideIcon name={localEditingId ? "Edit" : "Plus"} className="w-5 h-5 text-amber-600" />
                  {localEditingId ? "Edit Contact" : "New Contact"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Date & Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={localFormData.date}
                        onChange={(e) => setLocalFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <input
                        type="time"
                        value={localFormData.time}
                        onChange={(e) => setLocalFormData(prev => ({ ...prev, time: e.target.value }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Worker Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Worker Name</label>
                    <select
                      value={localFormData.worker_name}
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, worker_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select worker...</option>
                      {WORKER_NAMES.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Worker Credential */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title/Credential</label>
                    <select
                      value={localFormData.worker_credential}
                      onChange={(e) => setLocalFormData(prev => ({ ...prev, worker_credential: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select title...</option>
                      {WORKER_CREDENTIALS.map(cred => (
                        <option key={cred} value={cred}>{cred}</option>
                      ))}
                    </select>
                  </div>

                  {/* Family Name - Dropdown from Client Profiles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Family Name</label>
                    <select
                      value={localFormData.family_directory_key}
                      onChange={(e) => {
                        const selected = activeFamilyProfiles.find(o => o.key === e.target.value);
                        if (!selected) {
                          setLocalFormData(prev => ({ ...prev, family_directory_key: "", family_name: "" }));
                          return;
                        }
                        setLocalFormData(prev => ({
                          ...prev,
                          family_directory_key: selected.key,
                          family_name: selected.caseName || ""
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">-- Select Family --</option>
                      {activeFamilyProfiles.map(o => (
                        <option key={o.key} value={o.key}>
                          {o.mcNumber ? `${o.caseName} (${o.mcNumber})` : o.caseName}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {loadingDirectory
                        ? "Loading profiles…"
                        : activeFamilyProfiles.length
                          ? `${activeFamilyProfiles.length} active profiles`
                          : "No profiles found"}
                    </span>
                  </div>
                </div>

                {/* Contacted Parties - Checkboxes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Who was contacted? (Select all that apply)</label>
                  <div className="flex flex-wrap gap-3">
                    {CONTACT_PARTIES.map(party => (
                      <label
                        key={party}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          localFormData.contacted_parties.includes(party)
                            ? "bg-amber-100 border-amber-400 text-amber-800"
                            : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={localFormData.contacted_parties.includes(party)}
                          onChange={() => handlePartyToggle(party)}
                          className="sr-only"
                        />
                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                          localFormData.contacted_parties.includes(party)
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-gray-400"
                        }`}>
                          {localFormData.contacted_parties.includes(party) && (
                            <LucideIcon name="Check" className="w-3 h-3" />
                          )}
                        </span>
                        <span className="text-sm font-medium">{party}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Narrative */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Narrative</label>
                  <textarea
                    value={localFormData.narrative}
                    onChange={(e) => setLocalFormData(prev => ({ ...prev, narrative: e.target.value }))}
                    placeholder="Describe the contact - who you spoke with, what was discussed, any action items..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={saveContact}
                    disabled={saving}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <LucideIcon name="Save" className="w-4 h-4" />
                        {localEditingId ? "Update Contact" : "Save Contact"}
                      </>
                    )}
                  </button>
                  {localEditingId && (
                    <button
                      onClick={resetContactForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Contact History */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <LucideIcon name="History" className="w-5 h-5 text-amber-600" />
                  Contact History
                </h3>

                {loadingContacts ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
                    Loading contacts...
                  </div>
                ) : nonBillableContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <LucideIcon name="Inbox" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No contacts logged yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nonBillableContacts.map(contact => (
                      <div key={contact.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-800">{contact.family_name}</div>
                            <div className="text-sm text-gray-500">
                              {contact.date} {contact.time && `at ${contact.time}`} • {contact.worker_name}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => editContact(contact)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit"
                            >
                              <LucideIcon name="Edit2" className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteContact(contact.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete"
                            >
                              <LucideIcon name="Trash2" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(contact.contacted_parties || []).map(party => (
                            <span key={party} className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                              {party}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.narrative}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        };

	        const FormView = () => {
	          const currentService = formData.service_type;
	          const activeFields = currentService ? SERVICE_CONFIGS[currentService] || SERVICE_CONFIGS.default : [];
	
			          const match = findCaseMatch(formData);
			          const selectedDirectoryKey = (() => {
		            const fdk = normalize(formData.family_directory_key);
		            if (!fdk) return "";
		            if (familyDirectoryOptions.find(o => o.key === fdk)) return fdk;
		            const compat = familyDirectoryOptions.find(o => o.familyId === fdk || o.mcNumber === fdk);
		            return compat ? compat.key : fdk;
		          })();
			          const isCancelledByParent = formData.contact_type === "Cancelled by Parent";
			          const isCancelledByWorker = formData.contact_type === "Cancelled by Worker";
			          const isCancelledForWeather = formData.contact_type === "Cancelled for Weather";
			          const isCancelledByTeam = formData.contact_type === "Cancelled by Team";
			          const isCancelledNoConfirmation = formData.contact_type === "Cancelled No Confirmation";
			          const isCancelledInRoute = isCancelledByParent || isCancelledByWorker || isCancelledForWeather || isCancelledByTeam || isCancelledNoConfirmation; // For backwards compatibility
			          const isMonitoredVisit = formData.contact_type === "Monitored Visit";
			          const isRemoteContact = ["Phone Call", "Text Message"].includes(formData.contact_type || "");
		          // Only show locations saved for the selected family's profile (not global locations)
		          const profileLocationValues = (() => {
		            if (!match) return [];
		            const selected = familyDirectoryOptions.find((o) => o.key === (match.id || selectedDirectoryKey));
		            return (selected?.profileLocations || []).map((l) => String(l || "").trim()).filter(Boolean);
		          })();
		          // Auto-select: use current location if it's in the list, otherwise use first profile location
		          const selectedLocationValue = (() => {
		            const currentLoc = normalize(formData.location);
		            if (currentLoc && profileLocationValues.includes(currentLoc)) return currentLoc;
		            // Auto-select first saved location for this profile if no location is set
		            if (!currentLoc && profileLocationValues.length > 0) return profileLocationValues[0];
		            return "";
		          })();
		
		          const dropIns = Array.isArray(formData.dropins) ? formData.dropins : [];
		          const activeDropInId = normalize(formData.dropin_active_id) || normalize(dropIns[0]?.id);
		          const activeDropIn = dropIns.find((d) => normalize(d?.id) === activeDropInId) || null;

		          // Calculate units for current entry and remaining balance
		          const calculateCurrentEntryUnits = () => {
		            const serviceType = String(formData.service_type || "").toUpperCase();
		            const isDrugTest = serviceType.startsWith("DST");

		            if (isDrugTest) {
		              return { type: "occurrence", value: 1 };
		            }

		            // Calculate hours from start/end time
		            if (formData.start_time && formData.end_time) {
		              const [startH, startM] = formData.start_time.split(":").map(Number);
		              const [endH, endM] = formData.end_time.split(":").map(Number);
		              const startMins = (startH || 0) * 60 + (startM || 0);
		              const endMins = (endH || 0) * 60 + (endM || 0);
		              const durationHours = Math.max(0, (endMins - startMins) / 60);
		              return { type: "hours", value: Math.round(durationHours * 100) / 100 };
		            }

		            return { type: "hours", value: 0 };
		          };

		          const currentEntryUnits = calculateCurrentEntryUnits();

		          // Get profile's authorized units and calculate remaining
		          const selectedProfile = familyDirectoryOptions.find((o) =>
		            o.key === selectedDirectoryKey || o.familyId === selectedDirectoryKey
		          );
		          const entryServiceType = String(formData.service_type || "").toUpperCase();
		          const entryDate = formData.date ? new Date(formData.date) : new Date();
		          entryDate.setHours(0, 0, 0, 0);

		          const serviceTypeMatchesAuth = (authService, svcType) => {
		            const authType = String(authService || "").toUpperCase();
		            if (!authType || authType === "GENERAL") return true;
		            if (authType.startsWith("DST") && svcType.startsWith("DST")) return true;
		            return authType === svcType;
		          };

		          const getActiveAuthorization = () => {
		            if (!selectedProfile) return null;
		            const history = Array.isArray(selectedProfile.raw?.Authorization_History)
		              ? selectedProfile.raw.Authorization_History
		              : [];
		            const candidates = history.filter((auth) =>
		              serviceTypeMatchesAuth(auth.service_type, entryServiceType)
		            );
		            const sorted = [...candidates].sort((a, b) => {
		              const aDate = new Date(a.start_date);
		              const bDate = new Date(b.start_date);
		              return bDate.getTime() - aDate.getTime();
		            });
		            for (const auth of sorted) {
		              const start = new Date(auth.start_date);
		              const end = new Date(auth.end_date);
		              if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
		              start.setHours(0, 0, 0, 0);
		              end.setHours(23, 59, 59, 999);
		              if (entryDate >= start && entryDate <= end) return auth;
		            }
		            return null;
		          };

		          const activeAuthorization = getActiveAuthorization();
		          const effectiveAuth = activeAuthorization
		            ? {
		                startDate: activeAuthorization.start_date,
		                endDate: activeAuthorization.end_date,
		                totalUnits: activeAuthorization.total_units,
		                adjustments: Array.isArray(activeAuthorization.adjustments) ? activeAuthorization.adjustments : [],
		                isFromHistory: true,
		              }
		            : {
		                startDate: selectedProfile?.raw?.Auth_Start_Date,
		                endDate: selectedProfile?.raw?.Auth_End_Date,
		                totalUnits: selectedProfile?.raw?.Authorized_Units,
		                adjustments: Array.isArray(selectedProfile?.raw?.Unit_Adjustments)
		                  ? selectedProfile.raw.Unit_Adjustments
		                  : [],
		                isFromHistory: false,
		              };

		          const totalUnitAdjustments = effectiveAuth.adjustments.reduce((sum, adj) => {
		            const amount = parseFloat(adj.amount) || 0;
		            if (adj.type === "prior_usage") return sum;
		            if (adj.type === "units_increase" || adj.type === "increase") return sum + amount;
		            if (adj.type === "units_decrease" || adj.type === "decrease") return sum - amount;
		            return sum;
		          }, 0);

		          const priorUsageUnits = effectiveAuth.adjustments.reduce((sum, adj) => {
		            if (adj.type === "prior_usage") {
		              return sum + (parseFloat(adj.amount) || 0);
		            }
		            return sum;
		          }, 0);

		          const authorizedUnits = parseFloat(effectiveAuth.totalUnits) || 0;
		          const adjustedTotal = authorizedUnits + totalUnitAdjustments;

		          const calculateUsedUnits = () => {
		            if (!selectedProfile || !effectiveAuth.startDate || !effectiveAuth.endDate) {
		              return { hours: 0, occurrences: 0 };
		            }

		            const authStart = new Date(effectiveAuth.startDate);
		            const authEnd = new Date(effectiveAuth.endDate);
		            if (isNaN(authStart.getTime()) || isNaN(authEnd.getTime())) {
		              return { hours: 0, occurrences: 0 };
		            }
		            authStart.setHours(0, 0, 0, 0);
		            authEnd.setHours(23, 59, 59, 999);

		            const profileEntries = entries.filter((e) => {
		              if (editingEntryId && e.id === editingEntryId) return false;
		              const entryKey = e.family_directory_key || e.family_id;
		              if (entryKey !== selectedProfile.key && entryKey !== selectedProfile.familyId) return false;
		              const svcType = String(e.service_type || "").toUpperCase();
		              if (!serviceTypeMatchesAuth(activeAuthorization?.service_type, svcType)) return false;
		              const entryDateValue = e.date ? new Date(e.date) : null;
		              return entryDateValue && entryDateValue >= authStart && entryDateValue <= authEnd;
		            });

		            let totalHours = 0;
		            let drugTestCount = 0;

		            profileEntries.forEach((e) => {
		              const svcType = String(e.service_type || "").toUpperCase();
		              if (svcType.startsWith("DST")) {
		                drugTestCount += 1;
		              } else if (e.start_time && e.end_time) {
		                const [sH, sM] = e.start_time.split(":").map(Number);
		                const [eH, eM] = e.end_time.split(":").map(Number);
		                const sMins = (sH || 0) * 60 + (sM || 0);
		                const eMins = (eH || 0) * 60 + (eM || 0);
		                totalHours += Math.max(0, (eMins - sMins) / 60);
		              }
		            });

		            return { hours: Math.round(totalHours * 100) / 100, occurrences: drugTestCount };
		          };

		          const usedUnits = calculateUsedUnits();
		          const totalUsed = usedUnits.hours + usedUnits.occurrences + priorUsageUnits;
		          const afterThisEntry = totalUsed + currentEntryUnits.value;
		          const remainingAfterEntry = adjustedTotal - afterThisEntry;
		          const remainingBeforeEntry = adjustedTotal - totalUsed;
		          const hasAuthorization = adjustedTotal > 0 && effectiveAuth.startDate && effectiveAuth.endDate;
		          const dropInOptions = dropIns
		            .map((d, idx) => {
		              const id = normalize(d?.id);
		              if (!id) return null;
		            const start = normalize(d?.start_time);
		            const end = normalize(d?.end_time);
		            const time = [start, end].filter(Boolean).join(" - ");
		            const snippet = normalize(d?.narrative).slice(0, 40);
		            const labelParts = [`#${idx + 1}`, time || "(time?)"];
		            if (snippet) labelParts.push(`- ${snippet}${normalize(d?.narrative).length > 40 ? "…" : ""}`);
		              return { value: id, label: labelParts.join(" ") };
		            })
		            .filter(Boolean);

	          return (
	            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-20">
	              <div className="bg-[var(--brand-navy)] px-6 py-4 border-b border-slate-900">
	                <h2 className="text-xl font-bold text-white flex items-center">
	                  <LucideIcon name="Edit2" className="w-5 h-5 mr-2" />
	                  {editingEntryId ? "Edit Service Entry" : "New Service Entry"}
	                </h2>
	            <p className="text-white/80 text-sm mt-1">Select a service type to see required fields.</p>
	              </div>

	              <form onSubmit={handleSubmit} className="p-6 space-y-4">
	                {editingEntryId ? (
	                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
	                    <div className="text-sm text-amber-900 font-semibold">Editing an existing entry. Changes will update the saved note.</div>
	                    <Button variant="secondary" iconName="X" onClick={cancelEditEntry} className="rounded-xl">
	                      Cancel edit
	                    </Button>
	                  </div>
	                ) : null}

	                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
	                  <InputField
	                    label="Select Service Type"
                    type="select"
                    options={SERVICE_TYPES}
                    value={formData.service_type || ""}
                    onChange={(e) => handleInputChange("service_type", e.target.value)}
                    required={true}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Date of Service"
                    type="date"
                    value={formData.date || ""}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    required={true}
                  />
                  <InputField
                    label="Type of Contact"
                    type="select"
                    options={ALL_COLUMNS.find((c) => c.id === "contact_type").options}
                    value={formData.contact_type || ""}
                    onChange={(e) => handleInputChange("contact_type", e.target.value)}
                    required={true}
                  />
                </div>

		                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
		                  <InputField
		                    label="Start Time"
	                    type="time"
	                    value={formData.start_time || ""}
	                    onChange={(e) => handleInputChange("start_time", e.target.value)}
	                    required={true}
	                  />
		                  <InputField
		                    label="End Time"
		                    type="time"
		                    value={formData.end_time || ""}
		                    onChange={(e) => handleInputChange("end_time", e.target.value)}
		                    required={!isCancelledInRoute && !isRemoteContact}
		                  />
		                </div>

		                {/* Units Remaining Notification */}
		                {selectedProfile && entryServiceType && !hasAuthorization && (
		                  <div className="px-4 py-3 rounded-lg border flex items-center gap-2 bg-amber-50 border-amber-300 text-amber-800">
		                    <LucideIcon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
		                    <div className="text-sm font-medium">
		                      No authorization found for this service type/date. Add an authorization in the client profile to track units.
		                    </div>
		                  </div>
		                )}
		                {selectedProfile && hasAuthorization && currentEntryUnits.value > 0 && (
		                  <div className={`px-4 py-3 rounded-lg border flex items-center gap-2 ${
		                    remainingAfterEntry <= 0
		                      ? "bg-red-50 border-red-300 text-red-700"
		                      : remainingAfterEntry <= adjustedTotal * 0.2
		                        ? "bg-amber-50 border-amber-300 text-amber-700"
		                        : "bg-blue-50 border-blue-200 text-blue-700"
		                  }`}>
		                    <LucideIcon name={remainingAfterEntry <= 0 ? "AlertTriangle" : remainingAfterEntry <= adjustedTotal * 0.2 ? "AlertCircle" : "Clock"} className="w-5 h-5 flex-shrink-0" />
		                    <div className="text-sm font-medium">
		                      <div>
		                        Authorization: <strong>{effectiveAuth.startDate || "N/A"}</strong> to <strong>{effectiveAuth.endDate || "N/A"}</strong> •
		                        <strong> {adjustedTotal.toFixed(1)} total units</strong>
		                      </div>
		                      <div className="mt-1">
		                        {currentEntryUnits.type === "occurrence" ? (
		                          <span>This test will use <strong>1 unit</strong>. </span>
		                        ) : (
		                          <span>This visit will use <strong>{currentEntryUnits.value} units</strong>. </span>
		                        )}
		                        Used so far: <strong>{totalUsed.toFixed(1)} units</strong>. Remaining before: <strong>{remainingBeforeEntry.toFixed(1)}</strong>.{" "}
		                        {remainingAfterEntry <= 0 ? (
		                          <span className="text-red-800 font-bold">Units exceeded by {Math.abs(remainingAfterEntry).toFixed(1)}!</span>
		                        ) : (
		                          <span>Remaining after: <strong>{remainingAfterEntry.toFixed(1)} units</strong></span>
		                        )}
		                      </div>
		                    </div>
		                  </div>
		                )}

	                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
	                  <InputField
	                    label="Worker Name"
	                    type="select"
	                    options={WORKER_NAMES}
	                    value={formData.worker_name || ""}
	                    onChange={(e) => handleInputChange("worker_name", e.target.value)}
	                    required={true}
	                  />
	                  <InputField
	                    label="Credentials"
	                    type="select"
	                    options={WORKER_CREDENTIALS}
	                    value={formData.worker_credential || ""}
	                    onChange={(e) => handleInputChange("worker_credential", e.target.value)}
	                    required={true}
	                  />
	                </div>

	                <InputField
	                  label="Select Family (Dropdown)"
	                  type="select"
                  value={selectedDirectoryKey}
                  disabled={loadingDirectory}
                  onChange={(e) => {
                    const selected = familyDirectoryOptions.find((o) => o.key === e.target.value);
                    if (!selected) {
                      setFormData((prev) => ({ ...prev, family_directory_key: "", family_id: "" }));
                      return;
                    }
                    setFormData((prev) => {
                      const next = { ...prev };
                      next.family_directory_key = selected.key;
                      next.family_id = selected.familyId || selected.key;
                      next.family_name = selected.caseName || prev.family_name;
                      next.master_case = selected.mcNumber || prev.master_case;
                      next.cfss = selected.cfss || prev.cfss;
                      next.typical_location = selected.typicalLocation || prev.typical_location;
                      // Populate participants from profile (parents/children) and default-select all.
                      const participantList = selected.participantList || [];
                      if (participantList.length) {
                        const selectedMap = {};
                        participantList.forEach((p) => (selectedMap[p] = true));
                        next.participants_selected = selectedMap;
                        next.participants = participantList.join(", ");
                      } else if (!normalize(next.participants) && selected.participants) {
                        next.participants = selected.participants;
                      }
	                      // Auto-fill location from profile's saved locations (first one) or typicalLocation
	                      if (!normalize(next.location)) {
	                        const profileLocs = (selected.profileLocations || []).filter(l => String(l || "").trim());
	                        if (profileLocs.length > 0) {
	                          next.location = profileLocs[0];
	                        } else if (selected.typicalLocation) {
	                          next.location = selected.typicalLocation;
	                        }
	                      }
	                      if (selected.goalsText) next.referral_goals = selected.goalsText;
	                      next.goals_selected = {};
	                      next.goals_addressed = {};
	                      next.dropins = [];
	                      next.dropin_active_id = "";
	                      next.visit_narrative = "";

	                      if (selected.goalsText) next.goals_progress = composeGoalsBlock(
	                        { goals: selected.goals || getGoalsArray(selected.raw || {}), goalsText: selected.goalsText },
	                        {},
	                        {},
	                        {},
	                        {}
	                      );
	                      return next;
	                    });
	                  }}
                  options={familyDirectoryOptions.filter(o => !o.isArchived).map((o) => ({
                    value: o.key,
                    label: o.mcNumber ? `${o.caseName} (${o.mcNumber})` : o.caseName,
                  }))}
                >
                  <span className="text-xs text-gray-500">
                    {loadingDirectory
                      ? "Loading profiles…"
                      : familyDirectoryOptions.filter(o => !o.isArchived).length
                        ? `${familyDirectoryOptions.filter(o => !o.isArchived).length} active profiles`
                        : "No profiles found. Create one in the Client Profiles tab."}
                  </span>
                </InputField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Family Name"
                    type="text"
                    value={formData.family_name || ""}
                    onChange={(e) => handleInputChange("family_name", e.target.value)}
                    required={true}
                  />
                  <InputField
                    label="Master Case #"
                    type="text"
                    value={formData.master_case || ""}
                    onChange={(e) => handleInputChange("master_case", e.target.value)}
                  />
                </div>
	
	                <div className="flex justify-end">
	                  <Button
	                    variant="secondary"
	                    className="text-sm"
	                    iconName="Save"
	                    onClick={async () => {
	                      try {
	                        await upsertClientProfileFromEntry();
	                        alert("Client profile saved/updated.");
	                      } catch (err) {
	                        alert(String(err?.message || err));
	                      }
	                    }}
	                  >
	                    Save Client Profile
	                  </Button>
	                </div>

	                <InputField
	                  label="Saved Location"
	                  type="select"
	                  value={selectedLocationValue}
	                  onChange={(e) => handleInputChange("location", e.target.value)}
	                  options={profileLocationValues.map((v) => ({ value: v, label: v }))}
	                >
	                  <span className="text-xs text-gray-500">
	                    {profileLocationValues.length
	                      ? `${profileLocationValues.length} location(s) for this family`
	                      : match ? "No saved locations for this family" : "Select a family first"}
	                  </span>
	                </InputField>

	                <InputField
	                  label="Location"
	                  type="text"
	                  value={formData.location || ""}
	                  onChange={(e) => handleInputChange("location", e.target.value)}
	                  placeholder="e.g. Client Home, Office, School"
	                >
	                  <Button
	                    variant="secondary"
	                    className="text-xs"
	                    iconName="Save"
	                    disabled={!formData.location || !selectedDirectoryKey}
	                    onClick={async () => {
	                      if (!formData.location || !selectedDirectoryKey) {
	                        showToast("Enter a location and select a family first");
	                        return;
	                      }
	                      try {
	                        await saveLocationToProfile(formData.location, selectedDirectoryKey);
	                        showToast(`Location saved to ${match?.caseName || "family"} profile`);
	                      } catch (err) {
	                        showToast("Failed to save location: " + (err?.message || err));
	                      }
	                    }}
	                    title={selectedDirectoryKey ? "Save this location to the family's profile" : "Select a family first"}
	                  >
	                    Save to Profile
	                  </Button>
	                </InputField>

	                {!isCancelledInRoute && selectedDirectoryKey && (
	                  <div className="bg-white border border-gray-200 rounded-lg p-4">
	                    <div className="font-bold text-gray-800 mb-2">Participants</div>
	                    {match?.id && familyDirectoryOptions.find((o) => o.key === match.id)?.participantList?.length ? (
	                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
	                        {familyDirectoryOptions
	                          .find((o) => o.key === match.id)
	                          .participantList.map((name) => {
	                            const checked = Boolean(formData.participants_selected?.[name]);
	                            return (
	                              <label key={name} className="flex items-start gap-2 text-sm text-gray-800">
	                                <input
	                                  type="checkbox"
	                                  className="mt-0.5"
	                                  checked={checked}
	                                  onChange={(e) => {
	                                    const isChecked = e.target.checked;
	                                    setFormData((prev) => {
	                                      const next = { ...prev };
	                                      const selected = { ...(next.participants_selected || {}) };
	                                      if (isChecked) selected[name] = true;
	                                      else delete selected[name];
	                                      next.participants_selected = selected;
	                                      const participantsList = Object.keys(selected);
	                                      next.participants = participantsList.join(", ");
	                                      return next;
	                                    });
	                                  }}
	                                />
	                                <span>{name}</span>
	                              </label>
	                            );
	                          })}
	                      </div>
	                    ) : (
	                      <div className="text-sm text-gray-500">No participants on this profile yet. You can type them below.</div>
	                    )}
	
	                    <div className="mt-3">
	                      <InputField
	                        label="Participants (text)"
	                        type="text"
	                        value={formData.participants || ""}
	                        onChange={(e) => handleInputChange("participants", e.target.value)}
	                        placeholder="Edit participants for this note (comma-separated)"
	                      />
	                    </div>
	                  </div>
	                )}

		                {!isCancelledInRoute && currentService && isMonitoredVisit && (
		                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
		                    <div className="font-bold text-gray-900 mb-1">Monitored Visit</div>
		                    <div className="text-sm text-gray-600 mb-4">
		                      Use drop-ins to capture each check-in during the visit (start/end + brief narrative). Goals apply to the whole visit.
		                    </div>

		                    {match?.goals?.length ? (
		                      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
			                        <div className="flex items-center justify-between mb-3">
			                          <div className="font-bold text-gray-800">Goals</div>
			                          <div className="text-xs text-gray-500">Check goals addressed, describe how, and plan next steps.</div>
			                        </div>

		                        <div className="space-y-3">
			                          {match.goals.map((g) => {
			                            const checked = Boolean(formData.goals_selected?.[g.key]);
			                            return (
		                              <div key={g.key} className="bg-white border border-gray-200 rounded-lg p-3">
		                                <label className="flex items-start gap-3">
		                                  <input
		                                    type="checkbox"
		                                    className="mt-1"
			                                    checked={checked}
			                                    onChange={(e) => {
			                                      const isChecked = e.target.checked;
			                                      setFormData((prev) => {
			                                        const next = { ...prev };
			                                        const selected = { ...(next.goals_selected || {}) };
			                                        const addressed = { ...(next.goals_addressed || {}) };
			                                        const nextSteps = { ...(next.goals_next_steps || {}) };
			                                        if (isChecked) selected[g.key] = true;
			                                        else delete selected[g.key];
			                                        if (!isChecked) {
			                                          delete addressed[g.key];
			                                          delete nextSteps[g.key];
			                                        }
			                                        next.goals_selected = selected;
			                                        next.goals_addressed = addressed;
			                                        next.goals_next_steps = nextSteps;
			                                        return next;
			                                      });
			                                    }}
			                                  />
			                                  <div className="flex-1">
			                                    <div className="text-sm font-semibold text-gray-900">{g.text}</div>
			                                    {checked && (
			                                      <div className="mt-3 space-y-3">
						                                        <div>
						                                          <div className="flex items-center justify-between gap-3 mb-1">
						                                            <div className="text-xs font-bold text-gray-600">How was this goal addressed?</div>
						                                            <DictationButton
						                                              title="Dictate how this goal was addressed"
						                                              className="py-1 px-2 text-xs"
						                                              onText={(t) => {
						                                                const current = formData.goals_addressed?.[g.key] || "";
						                                                setFormData((prev) => ({
						                                                  ...prev,
						                                                  goals_addressed: { ...(prev.goals_addressed || {}), [g.key]: appendText(current, t) },
						                                                }));
						                                              }}
						                                            />
						                                          </div>
						                                          <textarea
					                                            rows={3}
					                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-sm bg-white"
					                                            value={formData.goals_addressed?.[g.key] || ""}
			                                            onChange={(e) => {
			                                              const value = e.target.value;
			                                              setFormData((prev) => ({
			                                                ...prev,
			                                                goals_addressed: { ...(prev.goals_addressed || {}), [g.key]: value },
			                                              }));
			                                            }}
					                                            placeholder="Describe what you did or observed related to this goal..."
					                                          />
					                                        </div>

						                                        <div>
						                                          <div className="flex items-center justify-between gap-3 mb-1">
						                                            <div className="text-xs font-bold text-gray-600">Plan to continue</div>
						                                            <DictationButton
						                                              title="Dictate plan to continue"
						                                              className="py-1 px-2 text-xs"
						                                              onText={(t) => {
						                                                const current = formData.goals_next_steps?.[g.key] || "";
						                                                setFormData((prev) => ({
						                                                  ...prev,
						                                                  goals_next_steps: { ...(prev.goals_next_steps || {}), [g.key]: appendText(current, t) },
						                                                }));
						                                              }}
						                                            />
						                                          </div>
						                                          <textarea
					                                            rows={2}
					                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-sm bg-white"
					                                            value={formData.goals_next_steps?.[g.key] || ""}
			                                            onChange={(e) => {
			                                              const value = e.target.value;
			                                              setFormData((prev) => ({
			                                                ...prev,
			                                                goals_next_steps: { ...(prev.goals_next_steps || {}), [g.key]: value },
			                                              }));
			                                            }}
					                                            placeholder="What will you do next to continue working on this goal?"
					                                          />
					                                        </div>
			                                      </div>
			                                    )}
			                                  </div>
			                                </label>
			                              </div>
		                            );
		                          })}
		                        </div>
		                      </div>
		                    ) : (
		                      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-600">
		                        No goals found for this profile. You can add goals in Client Profiles.
		                      </div>
		                    )}

		                    <div className="bg-white border border-gray-200 rounded-lg p-4">
		                      <div className="flex items-center justify-between mb-3">
		                        <div className="font-bold text-gray-800">Drop-ins</div>
		                        <div className="flex items-center gap-2">
		                          <Button
		                            variant="secondary"
		                            className="text-sm"
		                            iconName="Plus"
		                            onClick={() => {
		                              setFormData((prev) => {
		                                const existing = Array.isArray(prev.dropins) ? prev.dropins : [];
		                                const next = [...existing, { id: ensureDropInId({}), start_time: "", end_time: "", narrative: "" }];
		                                const activeId = next[next.length - 1]?.id;
		                                return { ...prev, dropins: next, dropin_active_id: activeId };
		                              });
		                            }}
		                          >
		                            New Drop-in
		                          </Button>
		                          <Button
		                            variant="danger"
		                            className="text-sm"
		                            iconName="Trash2"
		                            disabled={!activeDropInId}
		                            onClick={() => {
		                              if (!activeDropInId) return;
		                              if (!confirm("Delete this drop-in?")) return;
		                              setFormData((prev) => {
		                                const existing = Array.isArray(prev.dropins) ? prev.dropins : [];
		                                const remaining = existing.filter((d) => normalize(d?.id) !== normalize(activeDropInId));
		                                return {
		                                  ...prev,
		                                  dropins: remaining,
		                                  dropin_active_id: normalize(remaining[0]?.id),
		                                };
		                              });
		                            }}
		                          >
		                            Delete
		                          </Button>
		                        </div>
		                      </div>

		                      <InputField
		                        label="Select Drop-in"
		                        type="select"
		                        value={activeDropInId}
		                        options={dropInOptions}
		                        onChange={(e) => handleInputChange("dropin_active_id", e.target.value)}
		                      >
		                        <span className="text-xs text-gray-500">{dropIns.length ? `${dropIns.length} total` : "None yet"}</span>
		                      </InputField>

		                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
		                        <InputField
		                          label="Drop-in Start Time"
		                          type="time"
		                          value={activeDropIn?.start_time || ""}
		                          onChange={(e) => {
		                            const value = e.target.value;
		                            setFormData((prev) => {
		                              const existing = Array.isArray(prev.dropins) ? prev.dropins : [];
		                              const idx = existing.findIndex((d) => normalize(d?.id) === normalize(prev.dropin_active_id));
		                              if (idx === -1) return prev;
		                              const next = [...existing];
		                              next[idx] = { ...next[idx], start_time: value, id: ensureDropInId(next[idx]) };
		                              return { ...prev, dropins: next };
		                            });
		                          }}
		                        />
		                        <InputField
		                          label="Drop-in End Time"
		                          type="time"
		                          value={activeDropIn?.end_time || ""}
		                          onChange={(e) => {
		                            const value = e.target.value;
		                            setFormData((prev) => {
		                              const existing = Array.isArray(prev.dropins) ? prev.dropins : [];
		                              const idx = existing.findIndex((d) => normalize(d?.id) === normalize(prev.dropin_active_id));
		                              if (idx === -1) return prev;
		                              const next = [...existing];
		                              next[idx] = { ...next[idx], end_time: value, id: ensureDropInId(next[idx]) };
		                              return { ...prev, dropins: next };
		                            });
		                          }}
		                        />
		                      </div>

		                      <div className="mb-4">
		                        <div className="flex justify-between items-center mb-1">
		                          <label className="block text-sm font-bold text-gray-700">Drop-in Narrative</label>
		                        </div>
		                        <textarea
		                          value={activeDropIn?.narrative || ""}
		                          onChange={(e) => {
		                            const value = e.target.value;
		                            setFormData((prev) => {
		                              const existing = Array.isArray(prev.dropins) ? prev.dropins : [];
		                              const idx = existing.findIndex((d) => normalize(d?.id) === normalize(prev.dropin_active_id));
		                              if (idx === -1) return prev;
		                              const next = [...existing];
		                              next[idx] = { ...next[idx], narrative: value, id: ensureDropInId(next[idx]) };
		                              return { ...prev, dropins: next };
		                            });
		                          }}
		                          rows={4}
			                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] transition-colors shadow-sm text-gray-900 bg-white"
			                          placeholder="Brief narrative for this drop-in…"
			                        />
		                      </div>
		                    </div>
		                  </div>
		                )}

			                {!isCancelledInRoute && currentService && !isMonitoredVisit && (
			                  <>
			                    {match?.goals?.length ? (
			                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
			                        <div className="flex items-center justify-between mb-3">
			                          <div className="font-bold text-gray-800">Goals</div>
			                          <div className="text-xs text-gray-500">Check goals addressed, describe how, and plan next steps.</div>
			                        </div>

			                        <div className="space-y-3">
			                          {match.goals.map((g) => {
			                            const checked = Boolean(formData.goals_selected?.[g.key]);
			                            return (
			                              <div key={g.key} className="bg-white border border-gray-200 rounded-lg p-3">
			                                <label className="flex items-start gap-3">
			                                  <input
			                                    type="checkbox"
			                                    className="mt-1"
			                                    checked={checked}
			                                    onChange={(e) => {
			                                      const isChecked = e.target.checked;
			                                      setFormData((prev) => {
			                                        const next = { ...prev };
			                                        const selected = { ...(next.goals_selected || {}) };
			                                        const addressed = { ...(next.goals_addressed || {}) };
			                                        const nextSteps = { ...(next.goals_next_steps || {}) };
			                                        if (isChecked) selected[g.key] = true;
			                                        else delete selected[g.key];
			                                        if (!isChecked) {
			                                          delete addressed[g.key];
			                                          delete nextSteps[g.key];
			                                        }
			                                        next.goals_selected = selected;
			                                        next.goals_addressed = addressed;
			                                        next.goals_next_steps = nextSteps;
			                                        return next;
			                                      });
			                                    }}
			                                  />
			                                  <div className="flex-1">
			                                    <div className="text-sm font-semibold text-gray-900">{g.text}</div>
			                                    {checked && (
			                                      <div className="mt-3 space-y-3">
						                                        <div>
						                                          <div className="flex items-center justify-between gap-3 mb-1">
						                                            <div className="text-xs font-bold text-gray-600">How was this goal addressed?</div>
						                                            <DictationButton
						                                              title="Dictate how this goal was addressed"
						                                              className="py-1 px-2 text-xs"
						                                              onText={(t) => {
						                                                const current = formData.goals_addressed?.[g.key] || "";
						                                                setFormData((prev) => ({
						                                                  ...prev,
						                                                  goals_addressed: { ...(prev.goals_addressed || {}), [g.key]: appendText(current, t) },
						                                                }));
						                                              }}
						                                            />
						                                          </div>
						                                          <textarea
					                                            rows={3}
					                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-sm bg-white"
					                                            value={formData.goals_addressed?.[g.key] || ""}
			                                            onChange={(e) => {
			                                              const value = e.target.value;
			                                              setFormData((prev) => ({
			                                                ...prev,
			                                                goals_addressed: { ...(prev.goals_addressed || {}), [g.key]: value },
			                                              }));
			                                            }}
					                                            placeholder="Describe what you did or observed related to this goal..."
					                                          />
					                                        </div>

						                                        <div>
						                                          <div className="flex items-center justify-between gap-3 mb-1">
						                                            <div className="text-xs font-bold text-gray-600">Plan to continue</div>
						                                            <DictationButton
						                                              title="Dictate plan to continue"
						                                              className="py-1 px-2 text-xs"
						                                              onText={(t) => {
						                                                const current = formData.goals_next_steps?.[g.key] || "";
						                                                setFormData((prev) => ({
						                                                  ...prev,
						                                                  goals_next_steps: { ...(prev.goals_next_steps || {}), [g.key]: appendText(current, t) },
						                                                }));
						                                              }}
						                                            />
						                                          </div>
						                                          <textarea
					                                            rows={2}
					                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-sm bg-white"
					                                            value={formData.goals_next_steps?.[g.key] || ""}
			                                            onChange={(e) => {
			                                              const value = e.target.value;
			                                              setFormData((prev) => ({
			                                                ...prev,
			                                                goals_next_steps: { ...(prev.goals_next_steps || {}), [g.key]: value },
			                                              }));
			                                            }}
					                                            placeholder="What will you do next to continue working on this goal?"
					                                          />
					                                        </div>
			                                      </div>
			                                    )}
			                                  </div>
			                                </label>
			                              </div>
			                            );
			                          })}
			                        </div>
			                      </div>
			                    ) : null}
	
							                    <InputField
							                      label={
							                        formData.contact_type === "Phone Call"
							                          ? "Phone Call Narrative"
							                          : formData.contact_type === "Text Message"
							                            ? "Text Message Narrative"
							                            : "Session/Visit Narrative"
							                      }
							                      type="textarea"
							                      value={formData.visit_narrative || ""}
							                      onChange={(e) => handleInputChange("visit_narrative", e.target.value)}
							                      placeholder={
							                        formData.contact_type === "Phone Call"
							                          ? "Document the purpose of the call, key information shared, decisions made, and follow-up tasks."
							                          : formData.contact_type === "Text Message"
							                            ? "Document the purpose of the text(s), key information shared, decisions made, and follow-up tasks."
							                            : "Document what occurred, how you addressed safety/needs, and any key observations."
							                      }
							                    >
							                      <DictationButton
							                        title="Dictate narrative"
							                        onText={(t) => handleInputChange("visit_narrative", appendText(formData.visit_narrative, t))}
							                      />
							                    </InputField>
					                  </>
					                )}
	
	                {isCancelledByParent && currentService && (
	                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
	                    <div className="font-bold text-gray-900 mb-2">Cancelled by Parent - Contract Requirements</div>
	                    <div className="text-sm text-gray-700 mb-4">
	                      Complete the fields below to meet contract requirements for billing/documentation.
	                    </div>
	
				                    <InputField
				                      label="Notification"
				                      type="textarea"
				                      required={true}
				                      value={formData.cancellation_notification || ""}
				                      onChange={(e) => handleInputChange("cancellation_notification", e.target.value)}
				                      placeholder="Document that you notified the DHHS Case Manager by end of next business day (email/text/phone). Include who, how, and when."
				                    >
				                      <DictationButton
				                        title="Dictate Notification"
				                        onText={(t) => handleInputChange("cancellation_notification", appendText(formData.cancellation_notification, t))}
				                      />
				                    </InputField>
	
	                    {currentService.startsWith("DST") ? (
				                      <InputField
				                        label="Pre-Call (Drug Testing)"
				                        type="textarea"
				                        required={true}
				                        value={formData.cancellation_pre_call || ""}
				                        onChange={(e) => handleInputChange("cancellation_pre_call", e.target.value)}
				                        placeholder="Document the specific time you attempted to contact the client before driving to the location."
				                      >
				                        <DictationButton
				                          title="Dictate Pre-Call"
				                          onText={(t) => handleInputChange("cancellation_pre_call", appendText(formData.cancellation_pre_call, t))}
				                        />
				                      </InputField>
			                    ) : (
				                      <InputField
				                        label="Service Prep (Family Support/Visitation)"
				                        type="textarea"
				                        required={true}
				                        value={formData.cancellation_service_prep || ""}
				                        onChange={(e) => handleInputChange("cancellation_service_prep", e.target.value)}
				                        placeholder="Document the specific preparation work completed prior to the session."
				                      >
				                        <DictationButton
				                          title="Dictate Service Prep"
				                          onText={(t) => handleInputChange("cancellation_service_prep", appendText(formData.cancellation_service_prep, t))}
				                        />
				                      </InputField>
			                    )}
	
	                    <InputField
	                      label='Were you "En Route" when cancellation happened?'
	                      type="select"
	                      required={true}
	                      options={["Yes", "No"]}
	                      value={formData.cancellation_en_route || ""}
	                      onChange={(e) => handleInputChange("cancellation_en_route", e.target.value)}
	                    />
	                  </div>
	                )}

	                {isCancelledByWorker && currentService && (
	                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
	                    <div className="font-bold text-gray-900 mb-2">Cancelled by Worker - Documentation</div>
	                    <div className="text-sm text-gray-700 mb-4">
	                      Document the reason for worker-initiated cancellation and makeup plan.
	                    </div>

	                    <InputField
	                      label="Notification to DHHS Case Manager"
	                      type="textarea"
	                      required={true}
	                      value={formData.cancellation_notification || ""}
	                      onChange={(e) => handleInputChange("cancellation_notification", e.target.value)}
	                      placeholder="Document that you notified the DHHS Case Manager. Include who, how, and when."
	                    >
	                      <DictationButton
	                        title="Dictate Notification"
	                        onText={(t) => handleInputChange("cancellation_notification", appendText(formData.cancellation_notification, t))}
	                      />
	                    </InputField>

	                    <InputField
	                      label="Will this visit be made up?"
	                      type="select"
	                      required={true}
	                      options={["Yes", "No"]}
	                      value={formData.cancellation_will_makeup || ""}
	                      onChange={(e) => handleInputChange("cancellation_will_makeup", e.target.value)}
	                    />

	                    {formData.cancellation_will_makeup === "Yes" && (
	                      <InputField
	                        label="When will the visit be made up?"
	                        type="text"
	                        required={true}
	                        value={formData.cancellation_makeup_date || ""}
	                        onChange={(e) => handleInputChange("cancellation_makeup_date", e.target.value)}
	                        placeholder="Enter date/time when the visit will be rescheduled..."
	                      />
	                    )}

	                    {formData.cancellation_will_makeup === "No" && (
	                      <InputField
	                        label="Why will the visit not be made up?"
	                        type="textarea"
	                        required={true}
	                        value={formData.cancellation_no_makeup_reason || ""}
	                        onChange={(e) => handleInputChange("cancellation_no_makeup_reason", e.target.value)}
	                        placeholder="Explain why the visit cannot be rescheduled..."
	                      >
	                        <DictationButton
	                          title="Dictate Reason"
	                          onText={(t) => handleInputChange("cancellation_no_makeup_reason", appendText(formData.cancellation_no_makeup_reason, t))}
	                        />
	                      </InputField>
	                    )}
	                  </div>
	                )}

	                {isCancelledForWeather && currentService && (
	                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
	                    <div className="font-bold text-gray-900 mb-2">Cancelled for Weather - Documentation</div>
	                    <div className="text-sm text-gray-700 mb-4">
	                      Explain the weather conditions that led to the cancellation.
	                    </div>

	                    <InputField
	                      label="Weather Explanation"
	                      type="textarea"
	                      required={true}
	                      value={formData.weather_explanation || ""}
	                      onChange={(e) => handleInputChange("weather_explanation", e.target.value)}
	                      placeholder="Describe the weather conditions (e.g., ice, snow, flooding, severe storms) that made travel unsafe or prevented the visit..."
	                    >
	                      <DictationButton
	                        title="Dictate Weather Explanation"
	                        onText={(t) => handleInputChange("weather_explanation", appendText(formData.weather_explanation, t))}
	                      />
	                    </InputField>

	                    <InputField
	                      label="Notification to DHHS Case Manager"
	                      type="textarea"
	                      required={true}
	                      value={formData.cancellation_notification || ""}
	                      onChange={(e) => handleInputChange("cancellation_notification", e.target.value)}
	                      placeholder="Document that you notified the DHHS Case Manager. Include who, how, and when."
	                    >
	                      <DictationButton
	                        title="Dictate Notification"
	                        onText={(t) => handleInputChange("cancellation_notification", appendText(formData.cancellation_notification, t))}
	                      />
	                    </InputField>

	                    <InputField
	                      label="Will this visit be made up?"
	                      type="select"
	                      required={true}
	                      options={["Yes", "No"]}
	                      value={formData.cancellation_will_makeup || ""}
	                      onChange={(e) => handleInputChange("cancellation_will_makeup", e.target.value)}
	                    />

	                    {formData.cancellation_will_makeup === "Yes" && (
	                      <InputField
	                        label="When will the visit be made up?"
	                        type="text"
	                        required={true}
	                        value={formData.cancellation_makeup_date || ""}
	                        onChange={(e) => handleInputChange("cancellation_makeup_date", e.target.value)}
	                        placeholder="Enter date/time when the visit will be rescheduled..."
	                      />
	                    )}

	                    {formData.cancellation_will_makeup === "No" && (
	                      <InputField
	                        label="Why will the visit not be made up?"
	                        type="textarea"
	                        required={true}
	                        value={formData.cancellation_no_makeup_reason || ""}
	                        onChange={(e) => handleInputChange("cancellation_no_makeup_reason", e.target.value)}
	                        placeholder="Explain why the visit cannot be rescheduled..."
	                      >
	                        <DictationButton
	                          title="Dictate Reason"
	                          onText={(t) => handleInputChange("cancellation_no_makeup_reason", appendText(formData.cancellation_no_makeup_reason, t))}
	                        />
	                      </InputField>
	                    )}
	                  </div>
	                )}

	                {isCancelledByTeam && currentService && (
	                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
	                    <div className="font-bold text-gray-900 mb-2">Cancelled by Team - Documentation</div>
	                    <div className="text-sm text-gray-700 mb-4">
	                      Document the reason for team-initiated cancellation and makeup plan.
	                    </div>

	                    <InputField
	                      label="Notification to DHHS Case Manager"
	                      type="textarea"
	                      required={true}
	                      value={formData.cancellation_notification || ""}
	                      onChange={(e) => handleInputChange("cancellation_notification", e.target.value)}
	                      placeholder="Document that you notified the DHHS Case Manager. Include who, how, and when."
	                    >
	                      <DictationButton
	                        title="Dictate Notification"
	                        onText={(t) => handleInputChange("cancellation_notification", appendText(formData.cancellation_notification, t))}
	                      />
	                    </InputField>

	                    <InputField
	                      label="Will this visit be made up?"
	                      type="select"
	                      required={true}
	                      options={["Yes", "No"]}
	                      value={formData.cancellation_will_makeup || ""}
	                      onChange={(e) => handleInputChange("cancellation_will_makeup", e.target.value)}
	                    />

	                    {formData.cancellation_will_makeup === "Yes" && (
	                      <InputField
	                        label="When will the visit be made up?"
	                        type="text"
	                        required={true}
	                        value={formData.cancellation_makeup_date || ""}
	                        onChange={(e) => handleInputChange("cancellation_makeup_date", e.target.value)}
	                        placeholder="Enter date/time when the visit will be rescheduled..."
	                      />
	                    )}

	                    {formData.cancellation_will_makeup === "No" && (
	                      <InputField
	                        label="Why will the visit not be made up?"
	                        type="textarea"
	                        required={true}
	                        value={formData.cancellation_no_makeup_reason || ""}
	                        onChange={(e) => handleInputChange("cancellation_no_makeup_reason", e.target.value)}
	                        placeholder="Explain why the visit cannot be rescheduled..."
	                      >
	                        <DictationButton
	                          title="Dictate Reason"
	                          onText={(t) => handleInputChange("cancellation_no_makeup_reason", appendText(formData.cancellation_no_makeup_reason, t))}
	                        />
	                      </InputField>
	                    )}
	                  </div>
	                )}

	                {isCancelledNoConfirmation && currentService && (
	                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
	                    <div className="font-bold text-gray-900 mb-2">Cancelled - No Confirmation</div>
	                    <div className="text-sm text-gray-700 mb-4">
	                      Document the attempts made to confirm the visit.
	                    </div>

	                    <InputField
	                      label="Notification to DHHS Case Manager"
	                      type="textarea"
	                      required={true}
	                      value={formData.cancellation_notification || ""}
	                      onChange={(e) => handleInputChange("cancellation_notification", e.target.value)}
	                      placeholder="Document that you notified the DHHS Case Manager. Include who, how, and when."
	                    >
	                      <DictationButton
	                        title="Dictate Notification"
	                        onText={(t) => handleInputChange("cancellation_notification", appendText(formData.cancellation_notification, t))}
	                      />
	                    </InputField>

	                    <InputField
	                      label="Will this visit be made up?"
	                      type="select"
	                      required={true}
	                      options={["Yes", "No"]}
	                      value={formData.cancellation_will_makeup || ""}
	                      onChange={(e) => handleInputChange("cancellation_will_makeup", e.target.value)}
	                    />

	                    {formData.cancellation_will_makeup === "Yes" && (
	                      <InputField
	                        label="When will the visit be made up?"
	                        type="text"
	                        required={true}
	                        value={formData.cancellation_makeup_date || ""}
	                        onChange={(e) => handleInputChange("cancellation_makeup_date", e.target.value)}
	                        placeholder="Enter date/time when the visit will be rescheduled..."
	                      />
	                    )}

	                    {formData.cancellation_will_makeup === "No" && (
	                      <InputField
	                        label="Why will the visit not be made up?"
	                        type="textarea"
	                        required={true}
	                        value={formData.cancellation_no_makeup_reason || ""}
	                        onChange={(e) => handleInputChange("cancellation_no_makeup_reason", e.target.value)}
	                        placeholder="Explain why the visit cannot be rescheduled..."
	                      >
	                        <DictationButton
	                          title="Dictate Reason"
	                          onText={(t) => handleInputChange("cancellation_no_makeup_reason", appendText(formData.cancellation_no_makeup_reason, t))}
	                        />
	                      </InputField>
	                    )}
	                  </div>
	                )}

		                {currentService && !isRemoteContact && (
		                  <div className="mt-6 pt-6 border-t border-gray-100">
		                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{currentService} Documentation Requirements</h3>

		                    {/* Drug Testing Forms - Custom Conditional Logic */}
		                    {isDrugTestingService(currentService) && !isCancelledInRoute && (
		                      <div className="space-y-4">
		                        {/* Chain of Custody - ALWAYS REQUIRED */}
		                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
		                          <p className="text-sm font-semibold text-yellow-800 mb-3 flex items-center">
		                            <LucideIcon name="AlertTriangle" className="w-4 h-4 mr-2" />
		                            Chain of Custody is Imperative
		                          </p>
		                          <InputField
		                            label="Chain of Custody Followed?"
		                            type="select"
		                            options={["Yes", "No"]}
		                            value={formData.chain_of_custody || ""}
		                            onChange={(e) => handleInputChange("chain_of_custody", e.target.value)}
		                            required
		                          />
		                        </div>

		                        {/* DST-SP (Sweat Patch) specific fields */}
		                        {currentService === "DST-SP" && (
		                          <div className="space-y-4">
		                            <InputField
		                              label="Was the sweat patch removed?"
		                              type="select"
		                              options={["Yes", "No"]}
		                              value={formData.patch_removed || ""}
		                              onChange={(e) => handleInputChange("patch_removed", e.target.value)}
		                            />
		                            <InputField
		                              label="Was a new patch applied?"
		                              type="select"
		                              options={["Yes", "No"]}
		                              value={formData.new_patch_applied || ""}
		                              onChange={(e) => handleInputChange("new_patch_applied", e.target.value)}
		                            />
		                            <InputField
		                              label="Was the client willing to continue?"
		                              type="select"
		                              options={["Yes", "No"]}
		                              value={formData.client_willing_continue || ""}
		                              onChange={(e) => handleInputChange("client_willing_continue", e.target.value)}
		                            />
		                            <InputField
		                              label="Was the test mailed for confirmation?"
		                              type="select"
		                              options={["Yes", "No"]}
		                              value={formData.test_mailed || ""}
		                              onChange={(e) => handleInputChange("test_mailed", e.target.value)}
		                            />

		                            {/* Date Test Sent - shown when test is mailed */}
		                            {formData.test_mailed === "Yes" && (
		                              <InputField
		                                label="Date Test Sent"
		                                type="date"
		                                value={formData.sp_date_sent || ""}
		                                onChange={(e) => handleInputChange("sp_date_sent", e.target.value)}
		                              />
		                            )}

		                            {/* Sweat Patch Results Section */}
		                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4 mt-4">
		                              <p className="text-sm font-semibold text-purple-800 flex items-center">
		                                <LucideIcon name="FileText" className="w-4 h-4 mr-2" />
		                                Sweat Patch Results (enter when received)
		                              </p>
		                              <InputField
		                                label="Sweat Patch Result"
		                                type="select"
		                                options={["", "Negative", "Positive", "Tampered"]}
		                                value={formData.sp_test_result || ""}
		                                onChange={(e) => handleInputChange("sp_test_result", e.target.value)}
		                              />

		                              {/* Positive Result - Show drug list and admission fields */}
		                              {formData.sp_test_result === "Positive" && (
		                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
		                                  <p className="text-sm font-semibold text-red-800 flex items-center">
		                                    <LucideIcon name="AlertCircle" className="w-4 h-4 mr-2" />
		                                    Positive Result Documentation
		                                  </p>

		                                  <InputField
		                                    label="Did the client admit to using?"
		                                    type="select"
		                                    options={["Yes", "No"]}
		                                    value={formData.sp_client_admitted_use || ""}
		                                    onChange={(e) => handleInputChange("sp_client_admitted_use", e.target.value)}
		                                  />

		                                  {formData.sp_client_admitted_use === "No" && (
		                                    <InputField
		                                      label="If client did not admit, document explanation"
		                                      type="textarea"
		                                      value={formData.sp_non_admission_explanation || ""}
		                                      onChange={(e) => handleInputChange("sp_non_admission_explanation", e.target.value)}
		                                      placeholder="Document why the client did not admit to using..."
		                                    >
		                                      <DictationButton
		                                        title="Dictate explanation"
		                                        onText={(t) => handleInputChange("sp_non_admission_explanation", appendText(formData.sp_non_admission_explanation, t))}
		                                      />
		                                    </InputField>
		                                  )}

		                                  <InputField
		                                    label="Drugs Tested Positive For (select all that apply)"
		                                    type="multiselect"
		                                    options={["Alcohol", "Amphetamines", "Barbiturates", "Benzodiazepines", "Buprenorphine", "Cocaine", "EDDP (Methadone Metabolite)", "Fentanyl", "Marijuana (THC)", "MDMA (Ecstasy)", "Methadone", "Methamphetamine", "Opiates", "Oxycodone", "Phencyclidine (PCP)", "Tramadol", "Tricyclic Antidepressants", "Other"]}
		                                    value={formData.sp_drugs_tested_positive || ""}
		                                    onChange={(e) => handleInputChange("sp_drugs_tested_positive", e.target.value)}
		                                  />

		                                  {(formData.sp_drugs_tested_positive || "").includes("Other") && (
		                                    <InputField
		                                      label="If Other, please specify"
		                                      type="text"
		                                      value={formData.sp_other_drug_specify || ""}
		                                      onChange={(e) => handleInputChange("sp_other_drug_specify", e.target.value)}
		                                      placeholder="Specify other drug(s)..."
		                                    />
		                                  )}
		                                </div>
		                              )}

		                              {/* Tampered Result - Show documentation */}
		                              {formData.sp_test_result === "Tampered" && (
		                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
		                                  <p className="text-sm font-semibold text-orange-800 flex items-center">
		                                    <LucideIcon name="XCircle" className="w-4 h-4 mr-2" />
		                                    Tampered Documentation (Counts as Positive)
		                                  </p>
		                                  <InputField
		                                    label="Document tampered circumstances"
		                                    type="textarea"
		                                    value={formData.sp_tampered_explanation || ""}
		                                    onChange={(e) => handleInputChange("sp_tampered_explanation", e.target.value)}
		                                    placeholder="Document circumstances of tampering, evidence, observations, etc..."
		                                  >
		                                    <DictationButton
		                                      title="Dictate tampered explanation"
		                                      onText={(t) => handleInputChange("sp_tampered_explanation", appendText(formData.sp_tampered_explanation, t))}
		                                    />
		                                  </InputField>
		                                </div>
		                              )}
		                            </div>
		                          </div>
		                        )}

		                        {/* DST-U (Urinalysis) and DST-MS (Mouth Swab) specific fields */}
		                        {isUAorMS(currentService) && (
		                          <div className="space-y-4">
		                            <InputField
		                              label="Test Result"
		                              type="select"
		                              options={["Negative", "Positive", "Refusal"]}
		                              value={formData.test_result || ""}
		                              onChange={(e) => handleInputChange("test_result", e.target.value)}
		                            />

		                            {/* Positive Result - Show additional fields */}
		                            {formData.test_result === "Positive" && (
		                              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
		                                <p className="text-sm font-semibold text-red-800 flex items-center">
		                                  <LucideIcon name="AlertCircle" className="w-4 h-4 mr-2" />
		                                  Positive Result Documentation
		                                </p>

		                                <InputField
		                                  label="Did the client admit to using?"
		                                  type="select"
		                                  options={["Yes", "No"]}
		                                  value={formData.client_admitted_use || ""}
		                                  onChange={(e) => handleInputChange("client_admitted_use", e.target.value)}
		                                />

		                                {formData.client_admitted_use === "No" && (
		                                  <InputField
		                                    label="If client did not admit, document explanation"
		                                    type="textarea"
		                                    value={formData.non_admission_explanation || ""}
		                                    onChange={(e) => handleInputChange("non_admission_explanation", e.target.value)}
		                                    placeholder="Document why the client did not admit to using..."
		                                  >
		                                    <DictationButton
		                                      title="Dictate explanation"
		                                      onText={(t) => handleInputChange("non_admission_explanation", appendText(formData.non_admission_explanation, t))}
		                                    />
		                                  </InputField>
		                                )}

		                                <InputField
		                                  label="Drugs Tested Positive For (select all that apply)"
		                                  type="multiselect"
		                                  options={["Amphetamines", "Barbiturates", "Benzodiazepines", "Buprenorphine", "Cocaine", "EDDP (Methadone Metabolite)", "Fentanyl", "Marijuana (THC)", "MDMA (Ecstasy)", "Methadone", "Methamphetamine", "Opiates", "Oxycodone", "Phencyclidine (PCP)", "Tramadol", "Tricyclic Antidepressants", "Other"]}
		                                  value={formData.drugs_tested_positive || ""}
		                                  onChange={(e) => handleInputChange("drugs_tested_positive", e.target.value)}
		                                />

		                                {(formData.drugs_tested_positive || "").includes("Other") && (
		                                  <InputField
		                                    label="If Other, please specify"
		                                    type="text"
		                                    value={formData.other_drug_specify || ""}
		                                    onChange={(e) => handleInputChange("other_drug_specify", e.target.value)}
		                                    placeholder="Specify other drug(s)..."
		                                  />
		                                )}
		                              </div>
		                            )}

		                            {/* Refusal - Show refusal documentation */}
		                            {formData.test_result === "Refusal" && (
		                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
		                                <p className="text-sm font-semibold text-orange-800 flex items-center">
		                                  <LucideIcon name="XCircle" className="w-4 h-4 mr-2" />
		                                  Refusal Documentation (Counts as Positive)
		                                </p>
		                                <InputField
		                                  label="Document refusal reason/circumstances"
		                                  type="textarea"
		                                  value={formData.refusal_reason || ""}
		                                  onChange={(e) => handleInputChange("refusal_reason", e.target.value)}
		                                  placeholder="Document why the client refused, how they refused, circumstances, etc..."
		                                >
		                                  <DictationButton
		                                    title="Dictate refusal reason"
		                                    onText={(t) => handleInputChange("refusal_reason", appendText(formData.refusal_reason, t))}
		                                  />
		                                </InputField>
		                              </div>
		                            )}
		                          </div>
		                        )}

		                        {/* Lab Submission — all drug testing types */}
		                        {(() => {
		                          const isLabBasedTest = currentService === "DST-SP" || currentService === "DST-HF";
		                          const showLabUpload = isLabBasedTest || formData.sent_to_lab === "Yes";
		                          return (
		                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-4 mt-4">
		                          <p className="text-sm font-semibold text-indigo-800 flex items-center">
		                            <LucideIcon name="FlaskConical" className="w-4 h-4 mr-2" />
		                            {isLabBasedTest ? "Lab Results" : "Lab Submission"}
		                          </p>
		                          {isLabBasedTest ? (
		                            <p className="text-xs text-indigo-600">
		                              {currentService === "DST-SP" ? "Sweat patch" : "Hair follicle"} specimens are always sent to the lab. Upload a screenshot or paste the lab report text below.
		                            </p>
		                          ) : (
		                          <InputField
		                            label="Is this test being sent to the lab?"
		                            type="select"
		                            options={["Yes", "No"]}
		                            value={formData.sent_to_lab || ""}
		                            onChange={(e) => handleInputChange("sent_to_lab", e.target.value)}
		                          />
		                          )}

		                          {/* Lab results upload + paste area */}
		                          {showLabUpload && (
		                            <div className="space-y-3 bg-white rounded-lg p-4 border border-indigo-100">
		                              <p className="text-sm text-indigo-700 font-medium flex items-center">
		                                <LucideIcon name="Upload" className="w-4 h-4 mr-2" />
		                                Upload Lab Results Screenshot
		                              </p>
		                              <input
		                                type="file"
		                                accept="image/*"
		                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
		                                onChange={(e) => {
		                                  const file = e.target.files?.[0];
		                                  if (file) handleLabImageUpload(file);
		                                }}
		                                disabled={labResultLoading}
		                              />
		                              {labResultLoading && (
		                                <div className="flex items-center space-x-2 text-sm text-indigo-600">
		                                  <LucideIcon name="Loader2" className="w-4 h-4 animate-spin" />
		                                  <span>Extracting lab results...</span>
		                                </div>
		                              )}
		                              <div className="space-y-2">
		                                <p className="text-sm font-medium text-gray-700">{formData.lab_result_text ? "Lab Results:" : "Or paste lab report text:"}</p>
		                                <textarea
		                                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm text-gray-900 bg-white text-sm min-h-[120px]"
		                                  value={formData.lab_result_text || ""}
		                                  onChange={(e) => handleInputChange("lab_result_text", e.target.value)}
		                                  placeholder="Upload a screenshot above to auto-extract, or paste lab report text directly here..."
		                                />
		                              </div>
		                            </div>
		                          )}

		                          {/* Not sent to lab + positive/tampered/refusal → reason narrative */}
		                          {formData.sent_to_lab === "No" && (() => {
		                            const needsReason =
		                              (currentService === "DST-SP" && ["Positive", "Tampered"].includes(formData.sp_test_result)) ||
		                              (isUAorMS(currentService) && ["Positive", "Refusal"].includes(formData.test_result));
		                            return needsReason;
		                          })() && (
		                            <div className="space-y-2 bg-white rounded-lg p-4 border border-indigo-100">
		                              <InputField
		                                label="Why is this test not being sent to the lab?"
		                                type="textarea"
		                                value={formData.not_sent_to_lab_reason || ""}
		                                onChange={(e) => handleInputChange("not_sent_to_lab_reason", e.target.value)}
		                                placeholder="Document the reason this test is not being sent to the lab (e.g., client admitted use)..."
		                              >
		                                <DictationButton
		                                  title="Dictate reason"
		                                  onText={(t) => handleInputChange("not_sent_to_lab_reason", appendText(formData.not_sent_to_lab_reason, t))}
		                                />
		                              </InputField>
		                            </div>
		                          )}
		                        </div>
		                          );
		                        })()}
		                      </div>
		                    )}

		                    {/* Non-Drug Testing Forms - Standard field rendering */}
		                    {!isDrugTestingService(currentService) && activeFields.map((fieldId) => {
	                      if (fieldId === "goals_progress") return null;
	                      if (fieldId === "participants") return null;
	                      if (fieldId === "visit_narrative") return null;
	                      if (isCancelledInRoute) return null;

	                      // Handle Safety Assessment specially with conditional logic
	                      if (fieldId === "safety_concern_present") {
	                        return (
	                          <div key="safety-assessment-section" className="space-y-4">
	                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
	                              <p className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
	                                <LucideIcon name="Shield" className="w-4 h-4 mr-2" />
	                                Safety Assessment
	                              </p>
	                              <InputField
	                                label="Were there any safety concerns?"
	                                type="select"
	                                options={["No", "Yes"]}
	                                value={formData.safety_concern_present || ""}
	                                onChange={(e) => handleInputChange("safety_concern_present", e.target.value)}
	                              />

	                              {formData.safety_concern_present === "Yes" && (
	                                <div className="mt-4 space-y-4 bg-white rounded-lg p-4 border border-blue-100">
	                                  <InputField
	                                    label="What was the safety concern?"
	                                    type="textarea"
	                                    value={formData.safety_concern_description || ""}
	                                    onChange={(e) => handleInputChange("safety_concern_description", e.target.value)}
	                                    placeholder="Describe the safety concern observed..."
	                                  >
	                                    <DictationButton
	                                      title="Dictate concern"
	                                      onText={(t) => handleInputChange("safety_concern_description", appendText(formData.safety_concern_description, t))}
	                                    />
	                                  </InputField>

	                                  <InputField
	                                    label="How was it addressed?"
	                                    type="textarea"
	                                    value={formData.safety_concern_addressed || ""}
	                                    onChange={(e) => handleInputChange("safety_concern_addressed", e.target.value)}
	                                    placeholder="Describe how the concern was addressed..."
	                                  >
	                                    <DictationButton
	                                      title="Dictate response"
	                                      onText={(t) => handleInputChange("safety_concern_addressed", appendText(formData.safety_concern_addressed, t))}
	                                    />
	                                  </InputField>

	                                  <InputField
	                                    label="Who was notified? (select all that apply)"
	                                    type="multiselect"
	                                    options={["Supervisor Only", "All Parties", "HHS Hotline", "Further Notification Not Necessary"]}
	                                    value={formData.safety_notification || ""}
	                                    onChange={(e) => handleInputChange("safety_notification", e.target.value)}
	                                  />

	                                  {(formData.safety_notification || "").includes("HHS Hotline") && (
	                                    <InputField
	                                      label="HHS Hotline Intake Number (if applicable)"
	                                      type="text"
	                                      value={formData.safety_hotline_intake || ""}
	                                      onChange={(e) => handleInputChange("safety_hotline_intake", e.target.value)}
	                                      placeholder="Enter intake number..."
	                                    />
	                                  )}
	                                </div>
	                              )}
	                            </div>
	                          </div>
	                        );
	                      }

	                      const colConfig = ALL_COLUMNS.find((c) => c.id === fieldId);
	                      if (!colConfig) return null;
			                      return (
				                        <InputField
				                          key={colConfig.id}
				                          label={colConfig.name}
				                          type={colConfig.type}
				                          options={colConfig.id === "worker_name" ? WORKER_NAMES : colConfig.options}
				                          value={formData[colConfig.id] || ""}
				                          onChange={(e) => handleInputChange(colConfig.id, e.target.value)}
				                          placeholder={`Enter ${colConfig.name}`}
				                        >
				                          {colConfig.type === "textarea" ? (
				                            <DictationButton
				                              title={`Dictate ${colConfig.name}`}
				                              onText={(t) => handleInputChange(colConfig.id, appendText(formData[colConfig.id], t))}
				                            />
				                          ) : null}
				                        </InputField>
				                      );
				                    })}
		                  </div>
		                )}

	                <div className="pt-6 border-t border-gray-100">
	                  <div className="flex flex-col sm:flex-row gap-3">
	                    <Button
	                      type="button"
	                      disabled={submitting}
	                      className="w-full py-3 text-lg shadow-sm"
	                      variant="secondary"
	                      iconName="Plus"
	                      onClick={() => {
	                        resetForNewEntry();
	                        showToast("Ready for a new case note.");
	                      }}
	                    >
	                      New Case Note
	                    </Button>
	                    <Button
	                      type="submit"
	                      disabled={submitting || !currentService}
	                      className="w-full py-3 text-lg shadow-md"
	                      variant="primary"
	                      iconName="Check"
	                    >
	                      {submitting ? "Saving..." : editingEntryId ? "Update Entry" : "Save Entry"}
	                    </Button>
	                  </div>
	                </div>
	              </form>
            </div>
          );
        };

        const NotePreviewModal = () => {
          if (!previewNote) return null;
          const text = generateNoteText(previewNote);
          const specificFields = SERVICE_CONFIGS[previewNote.service_type] || SERVICE_CONFIGS.default;

          return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <LucideIcon name="FileText" className="w-5 h-5 mr-2 text-[var(--brand-navy)]" />
                    View Case Note
                  </h3>
                  <button onClick={() => setPreviewNote(null)} className="text-gray-500 hover:text-gray-700">
                    <LucideIcon name="X" className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto flex-grow bg-white">
                  <div className="mb-8 border-b-2 border-blue-800 pb-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Case Note</h1>
                        <p className="text-blue-700 font-semibold">{previewNote.service_type} Service</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-500">Master Case #</p>
                        <p className="text-lg font-mono text-gray-900">{previewNote.master_case || "N/A"}</p>
                      </div>
                    </div>
                  </div>

	                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 sm:gap-x-8 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
	                    <div>
	                      <span className="text-xs font-bold text-gray-500 uppercase block">Worker</span>
	                      <span className="text-gray-900 font-medium">{previewNote.worker_name || ""}</span>
	                    </div>
	                    <div>
	                      <span className="text-xs font-bold text-gray-500 uppercase block">Credentials</span>
	                      <span className="text-gray-900 font-medium">{previewNote.worker_credential || ""}</span>
	                    </div>
	                    <div>
	                      <span className="text-xs font-bold text-gray-500 uppercase block">Family Name</span>
	                      <span className="text-gray-900 font-medium">{previewNote.family_name}</span>
	                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase block">Date of Service</span>
                      <span className="text-gray-900 font-medium">{previewNote.date}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase block">Time</span>
                      <span className="text-gray-900 font-medium">
                        {formatTime12h(previewNote.start_time)} - {formatTime12h(previewNote.end_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase block">Contact Type</span>
                      <span className="text-gray-900 font-medium">{previewNote.contact_type}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-bold text-gray-500 uppercase block">Location</span>
                      <span className="text-gray-900 font-medium">{previewNote.location}</span>
                    </div>
                  </div>

	                  <div className="space-y-6">
	                    {previewNote.contact_type !== "Cancelled In Route" && previewNote.goals_progress ? (
	                      <div>
	                        <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Goals</h3>
	                        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{stripGoalsMarker(previewNote.goals_progress)}</div>
	                      </div>
	                    ) : null}

	                    {/* Drug Testing Preview - Custom Layout */}
	                    {isDrugTestingService(previewNote.service_type) && (
	                      <div className="space-y-4">
	                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
	                          <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Chain of Custody</h3>
	                          <div className="text-gray-700 font-medium">{previewNote.chain_of_custody || "N/A"}</div>
	                        </div>

	                        {previewNote.service_type === "DST-SP" && (
	                          <div className="space-y-4">
	                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
	                              <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-3">Sweat Patch Documentation</h3>
	                              <div className="grid grid-cols-2 gap-4 text-sm">
	                                <div><span className="font-semibold text-gray-600">Patch Removed:</span> <span className="text-gray-900">{previewNote.patch_removed || "N/A"}</span></div>
	                                <div><span className="font-semibold text-gray-600">New Patch Applied:</span> <span className="text-gray-900">{previewNote.new_patch_applied || "N/A"}</span></div>
	                                <div><span className="font-semibold text-gray-600">Client Willing to Continue:</span> <span className="text-gray-900">{previewNote.client_willing_continue || "N/A"}</span></div>
	                                <div><span className="font-semibold text-gray-600">Test Mailed:</span> <span className="text-gray-900">{previewNote.test_mailed || "N/A"}</span></div>
	                                {previewNote.sp_date_sent && (
	                                  <div><span className="font-semibold text-gray-600">Date Test Sent:</span> <span className="text-gray-900">{previewNote.sp_date_sent}</span></div>
	                                )}
	                              </div>
	                            </div>

	                            {/* Sweat Patch Results */}
	                            {previewNote.sp_test_result ? (
	                              <div className={`rounded-lg p-4 ${previewNote.sp_test_result === "Negative" ? "bg-green-50 border border-green-200" : previewNote.sp_test_result === "Positive" ? "bg-red-50 border border-red-200" : previewNote.sp_test_result === "Tampered" ? "bg-orange-50 border border-orange-200" : "bg-gray-50 border border-gray-200"}`}>
	                                <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Sweat Patch Result</h3>
	                                <div className={`font-bold text-lg ${previewNote.sp_test_result === "Negative" ? "text-green-700" : previewNote.sp_test_result === "Positive" ? "text-red-700" : previewNote.sp_test_result === "Tampered" ? "text-orange-700" : "text-gray-700"}`}>
	                                  {previewNote.sp_test_result}
	                                </div>

	                                {previewNote.sp_test_result === "Positive" && (
	                                  <div className="mt-3 space-y-2 text-sm">
	                                    <div><span className="font-semibold text-gray-600">Client Admitted to Using:</span> <span className="text-gray-900">{previewNote.sp_client_admitted_use || "N/A"}</span></div>
	                                    {previewNote.sp_client_admitted_use === "No" && previewNote.sp_non_admission_explanation && (
	                                      <div>
	                                        <span className="font-semibold text-gray-600 block mb-1">Non-Admission Explanation:</span>
	                                        <div className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">{previewNote.sp_non_admission_explanation}</div>
	                                      </div>
	                                    )}
	                                    {previewNote.sp_drugs_tested_positive && (
	                                      <div><span className="font-semibold text-gray-600">Drugs Tested Positive For:</span> <span className="text-gray-900">{previewNote.sp_drugs_tested_positive}</span></div>
	                                    )}
	                                    {previewNote.sp_other_drug_specify && (
	                                      <div><span className="font-semibold text-gray-600">Other Drug(s):</span> <span className="text-gray-900">{previewNote.sp_other_drug_specify}</span></div>
	                                    )}
	                                  </div>
	                                )}

	                                {previewNote.sp_test_result === "Tampered" && previewNote.sp_tampered_explanation && (
	                                  <div className="mt-3 text-sm">
	                                    <p className="text-sm font-semibold text-orange-800 mb-1">Tampered (Counts as Positive)</p>
	                                    <span className="font-semibold text-gray-600 block mb-1">Tampered Circumstances:</span>
	                                    <div className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">{previewNote.sp_tampered_explanation}</div>
	                                  </div>
	                                )}
	                              </div>
	                            ) : (
	                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
	                                <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Sweat Patch Result</h3>
	                                <div className="text-gray-500 italic">Results pending</div>
	                              </div>
	                            )}
	                          </div>
	                        )}

	                        {isUAorMS(previewNote.service_type) && (
	                          <div>
	                            <div className={`rounded-lg p-4 ${previewNote.test_result === "Negative" ? "bg-green-50 border border-green-200" : previewNote.test_result === "Positive" ? "bg-red-50 border border-red-200" : previewNote.test_result === "Refusal" ? "bg-orange-50 border border-orange-200" : "bg-gray-50 border border-gray-200"}`}>
	                              <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Test Result</h3>
	                              <div className={`font-bold text-lg ${previewNote.test_result === "Negative" ? "text-green-700" : previewNote.test_result === "Positive" ? "text-red-700" : previewNote.test_result === "Refusal" ? "text-orange-700" : "text-gray-700"}`}>
	                                {previewNote.test_result || "N/A"}
	                              </div>
	                            </div>

	                            {previewNote.test_result === "Positive" && (
	                              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
	                                <div><span className="font-semibold text-gray-600">Client Admitted to Using:</span> <span className="text-gray-900">{previewNote.client_admitted_use || "N/A"}</span></div>
	                                {previewNote.client_admitted_use === "No" && previewNote.non_admission_explanation && (
	                                  <div>
	                                    <span className="font-semibold text-gray-600 block mb-1">Non-Admission Explanation:</span>
	                                    <div className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">{previewNote.non_admission_explanation}</div>
	                                  </div>
	                                )}
	                                {previewNote.drugs_tested_positive && (
	                                  <div><span className="font-semibold text-gray-600">Drugs Tested Positive For:</span> <span className="text-gray-900">{previewNote.drugs_tested_positive}</span></div>
	                                )}
	                                {previewNote.other_drug_specify && (
	                                  <div><span className="font-semibold text-gray-600">Other Drug(s):</span> <span className="text-gray-900">{previewNote.other_drug_specify}</span></div>
	                                )}
	                              </div>
	                            )}

	                            {previewNote.test_result === "Refusal" && (
	                              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
	                                <p className="text-sm font-semibold text-orange-800 mb-2">Refusal (Counts as Positive)</p>
	                                {previewNote.refusal_reason && (
	                                  <div>
	                                    <span className="font-semibold text-gray-600 block mb-1">Refusal Reason/Circumstances:</span>
	                                    <div className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">{previewNote.refusal_reason}</div>
	                                  </div>
	                                )}
	                              </div>
	                            )}
	                          </div>
	                        )}

	                        {/* Lab Results Preview */}
	                        {previewNote.lab_result_text && (
	                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
	                            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1 mb-2 flex items-center">
	                              <LucideIcon name="FlaskConical" className="w-4 h-4 mr-2" />
	                              {["DST-SP", "DST-HF"].includes(previewNote.service_type) ? "Lab Report Results" : "Lab Results"}
	                            </h3>
	                            <div className="text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border text-sm">{previewNote.lab_result_text}</div>
	                          </div>
	                        )}
	                        {!previewNote.lab_result_text && previewNote.sent_to_lab === "Yes" && (
	                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
	                            <h3 className="text-sm font-bold text-yellow-900 uppercase border-b border-yellow-200 pb-1 mb-2 flex items-center">
	                              <LucideIcon name="FlaskConical" className="w-4 h-4 mr-2" />
	                              Lab Submission
	                            </h3>
	                            <div className="text-gray-700 text-sm">Specimen sent to lab — results pending.</div>
	                          </div>
	                        )}
	                        {previewNote.sent_to_lab === "No" && previewNote.not_sent_to_lab_reason && (
	                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
	                            <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Not Sent to Lab</h3>
	                            <div className="text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border text-sm">{previewNote.not_sent_to_lab_reason}</div>
	                          </div>
	                        )}
	                      </div>
	                    )}

	                    {/* Non-Drug Testing Fields - Standard Layout */}
	                    {!isDrugTestingService(previewNote.service_type) && specificFields.map((fieldId) => {
	                      if (fieldId === "goals_progress") return null;

	                      // Handle Safety Assessment specially
	                      if (fieldId === "safety_concern_present") {
	                        return (
	                          <div key="safety-preview" className="space-y-3">
	                            <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Safety Assessment</h3>
	                            {previewNote.safety_concern_present === "No" || !previewNote.safety_concern_present ? (
	                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
	                                <p className="text-green-700 font-medium flex items-center">
	                                  <LucideIcon name="CheckCircle" className="w-4 h-4 mr-2" />
	                                  No safety concerns identified
	                                </p>
	                              </div>
	                            ) : (
	                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
	                                <p className="text-yellow-800 font-semibold flex items-center">
	                                  <LucideIcon name="AlertTriangle" className="w-4 h-4 mr-2" />
	                                  Safety Concern Present
	                                </p>
	                                {previewNote.safety_concern_description && (
	                                  <div>
	                                    <span className="font-semibold text-gray-600 block mb-1">Concern:</span>
	                                    <div className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">{previewNote.safety_concern_description}</div>
	                                  </div>
	                                )}
	                                {previewNote.safety_concern_addressed && (
	                                  <div>
	                                    <span className="font-semibold text-gray-600 block mb-1">How Addressed:</span>
	                                    <div className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">{previewNote.safety_concern_addressed}</div>
	                                  </div>
	                                )}
	                                {previewNote.safety_notification && (
	                                  <div>
	                                    <span className="font-semibold text-gray-600">Notified:</span>
	                                    <span className="text-gray-700 ml-2">{previewNote.safety_notification}</span>
	                                  </div>
	                                )}
	                                {previewNote.safety_hotline_intake && (
	                                  <div>
	                                    <span className="font-semibold text-gray-600">HHS Hotline Intake #:</span>
	                                    <span className="text-gray-700 ml-2">{previewNote.safety_hotline_intake}</span>
	                                  </div>
	                                )}
	                              </div>
	                            )}
	                          </div>
	                        );
	                      }

	                      const fieldConfig = ALL_COLUMNS.find((c) => c.id === fieldId);
	                      if (!fieldConfig || !previewNote[fieldId]) return null;
		                      const label =
		                        fieldId === "visit_narrative" && previewNote.contact_type === "Monitored Visit"
		                          ? "Drop-ins"
		                          : fieldId === "visit_narrative" && previewNote.contact_type === "Phone Call"
		                            ? "Phone Call Narrative"
		                            : fieldId === "visit_narrative" && previewNote.contact_type === "Text Message"
		                              ? "Text Message Narrative"
		                              : fieldConfig.name;
	                      return (
	                        <div key={fieldId}>
	                          <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">{label}</h3>
	                          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{previewNote[fieldId]}</div>
	                        </div>
	                      );
	                    })}
	                  </div>
                </div>

		                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end space-x-3">
		                  <Button variant="secondary" onClick={() => setPreviewNote(null)}>
		                    Close
		                  </Button>
		                  <Button
		                    variant="secondary"
		                    iconName="Edit2"
		                    onClick={() => {
		                      const entry = previewNote;
		                      setPreviewNote(null);
		                      startEditEntry(entry);
		                    }}
		                  >
		                    Edit
		                  </Button>
		                  <Button
		                    variant="secondary"
		                    iconName="Printer"
		                    onClick={() => printCaseNotes([previewNote])}
		                  >
	                    Print Case Note
	                  </Button>
	                  <Button
	                    variant="primary"
	                    iconName="Copy"
	                    onClick={() => {
                      copyToClipboard(text);
                      setPreviewNote(null);
                    }}
                  >
                    Copy Text for N-FOCUS
                  </Button>
                </div>
              </div>
            </div>
          );
        };

		        const TableView = () => {
		          // Get list of archived profile keys to filter entries
		          const archivedProfileKeys = new Set(
		            familyDirectoryOptions.filter(o => o.isArchived).map(o => o.key)
		          );
		          const archivedCaseNames = new Set(
		            familyDirectoryOptions.filter(o => o.isArchived).map(o => (o.caseName || "").toLowerCase())
		          );
		          const archivedMcNumbers = new Set(
		            familyDirectoryOptions.filter(o => o.isArchived).map(o => o.mcNumber).filter(Boolean)
		          );

		          const filteredEntries = entries
		            .filter((entry) => entryMatchesClient(entry, historyClientKey))
		            .filter((entry) => {
		              // Exclude entries belonging to archived profiles
		              if (entry.family_directory_key && archivedProfileKeys.has(entry.family_directory_key)) return false;
		              if (entry.family_name && archivedCaseNames.has((entry.family_name || "").toLowerCase())) return false;
		              if (entry.master_case && archivedMcNumbers.has(entry.master_case)) return false;
		              return true;
		            })
		            .filter((entry) => {
		              // Date range filter
		              if (!historyDateStart && !historyDateEnd) return true;
		              const entryDate = entry.date || "";
		              if (historyDateStart && entryDate < historyDateStart) return false;
		              if (historyDateEnd && entryDate > historyDateEnd) return false;
		              return true;
		            })
		            .filter((entry) => {
		              const search = filterText.toLowerCase();
		              return (entry.family_name || "").toLowerCase().includes(search) || (entry.master_case || "").toLowerCase().includes(search);
		            })
		            .filter((entry) => {
		              if (!historyServiceFilter) return true;
		              return (entry.service_type || "") === historyServiceFilter;
		            })
		            .sort((a, b) => {
		              if (!historyServiceFilter) {
		                // Group by service type in SERVICE_TYPES order, then by date within each group
		                const aIdx = SERVICE_TYPES.indexOf(a.service_type || "");
		                const bIdx = SERVICE_TYPES.indexOf(b.service_type || "");
		                const aSvc = aIdx === -1 ? SERVICE_TYPES.length : aIdx;
		                const bSvc = bIdx === -1 ? SERVICE_TYPES.length : bIdx;
		                if (aSvc !== bSvc) return aSvc - bSvc;
		              }
		              return (a.date || "").localeCompare(b.date || "");
		            });

		          // Filter profiles to exclude archived ones
		          const filteredProfiles = familyDirectoryOptions
		            .filter((p) => !p.isArchived) // Exclude archived profiles
		            .filter((p) => (historyClientKey ? p.key === historyClientKey : true))
		            .filter((p) => {
		              const search = filterText.toLowerCase();
		              return (
		                (p.caseName || "").toLowerCase().includes(search) ||
		                (p.mcNumber || "").toLowerCase().includes(search) ||
		                (p.familyId || "").toLowerCase().includes(search)
		              );
		            });

		          // Filter client options to exclude archived profiles
		          const clientOptions = familyDirectoryOptions
		            .filter((o) => !o.isArchived)
		            .map((o) => ({
		              value: o.key,
		              label: o.mcNumber ? `${o.caseName} (${o.mcNumber})` : o.caseName,
		            }));

		          // Keep around if we want to show client details in the header later.
		          const selectedClientProfile = historyClientKey ? familyDirectoryOptions.find((o) => o.key === historyClientKey) : null;
		          const selectedCount = filteredEntries.filter((e) => Boolean(selectedEntryIds?.[e.id])).length;
		          const toggleAllFiltered = (checked) => {
		            const next = { ...(selectedEntryIds || {}) };
		            filteredEntries.forEach((e) => {
		              if (!e?.id) return;
		              if (checked) next[e.id] = true;
		              else delete next[e.id];
		            });
		            setSelectedEntryIds(next);
		          };

		          return (
			            <div className="bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-lg border-0 sm:border sm:border-gray-100 overflow-hidden flex flex-col max-h-none sm:max-h-[calc(100vh-160px)] lg:max-h-[calc(100vh-200px)] mb-0 sm:mb-20">
			              <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50 gap-3 sm:gap-4">
		                <h2 className="text-lg font-bold text-gray-800 flex items-center">
		                  <LucideIcon name="Table" className="w-5 h-5 mr-2 text-[var(--brand-navy)]" />
	                  Note History ({historyMode === "entries" ? filteredEntries.length : filteredProfiles.length})
	                </h2>

			                <div className="flex w-full lg:w-auto gap-2 sm:gap-3 flex-wrap">
			                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
			                    <button
			                      type="button"
			                      onClick={() => setHistoryMode("entries")}
		                      className={`px-3 py-2 text-sm ${historyMode === "entries" ? "bg-[var(--brand-navy)] text-white" : "bg-white text-gray-700"}`}
		                    >
	                      Entries
	                    </button>
		                    <button
		                      type="button"
		                      onClick={() => setHistoryMode("profiles")}
		                      className={`px-3 py-2 text-sm ${historyMode === "profiles" ? "bg-[var(--brand-navy)] text-white" : "bg-white text-gray-700"}`}
		                    >
		                      Profiles
		                    </button>
		                  </div>

				                  <div className="flex items-center gap-2 sm:gap-3 bg-white border border-gray-300 rounded-xl px-3 sm:px-4 py-2 sm:py-3 w-full lg:min-w-[420px]">
			                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Client</div>
			                    <select
			                      value={historyClientKey}
			                      onChange={(e) => {
			                        setHistoryClientKey(e.target.value);
			                        setHistoryServiceFilter("");
			                        setSelectedEntryIds({});
			                      }}
			                      className="bg-white text-sm text-gray-900 focus:outline-none flex-1 min-w-0 px-2 py-1"
			                    >
			                      <option value="">All Clients</option>
			                      {clientOptions.map((o) => (
			                        <option key={o.value} value={o.value}>
			                          {o.label}
			                        </option>
			                      ))}
			                    </select>
			                  </div>

			                  <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 sm:px-4 py-2 sm:py-3 w-full lg:w-auto flex-wrap">
			                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Date</div>
			                    <input
			                      type="date"
			                      value={historyDateStart}
			                      onChange={(e) => setHistoryDateStart(e.target.value)}
			                      className="bg-white text-sm text-gray-900 focus:outline-none px-1 sm:px-2 py-1 border-r border-gray-200 min-w-0 flex-1"
			                    />
			                    <span className="text-gray-400 text-sm">to</span>
			                    <input
			                      type="date"
			                      value={historyDateEnd}
			                      onChange={(e) => setHistoryDateEnd(e.target.value)}
			                      className="bg-white text-sm text-gray-900 focus:outline-none px-1 sm:px-2 py-1 min-w-0 flex-1"
			                    />
			                    {(historyDateStart || historyDateEnd) && (
			                      <button
			                        type="button"
			                        onClick={() => { setHistoryDateStart(""); setHistoryDateEnd(""); }}
			                        className="text-gray-400 hover:text-gray-600 ml-1"
			                        title="Clear date filter"
			                      >
			                        <LucideIcon name="X" className="w-4 h-4" />
			                      </button>
			                    )}
			                  </div>

			                  <div className="flex items-center gap-2 sm:gap-3 bg-white border border-gray-300 rounded-xl px-3 sm:px-4 py-2 sm:py-3 w-full lg:min-w-[220px]">
			                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Service</div>
			                    <select
			                      value={historyServiceFilter}
			                      onChange={(e) => {
			                        setHistoryServiceFilter(e.target.value);
			                        setSelectedEntryIds({});
			                      }}
			                      className="bg-white text-sm text-gray-900 focus:outline-none flex-1 min-w-0 px-2 py-1"
			                    >
			                      <option value="">All Services</option>
			                      {SERVICE_TYPES.map((svc) => (
			                        <option key={svc} value={svc}>{svc}</option>
			                      ))}
			                    </select>
			                  </div>

		                  {historyClientKey && isAdmin && (
		                    <Button
		                      variant="secondary"
		                      className="text-sm whitespace-nowrap"
		                      iconName="Edit2"
		                      onClick={() => {
		                        setSelectedProfileKey(historyClientKey);
		                        setActiveTab("goals");
		                      }}
		                      title="Edit this client's profile"
		                    >
		                      Edit Profile
		                    </Button>
		                  )}

			                  <div className="relative w-full lg:flex-grow lg:min-w-[320px]">
	                    <input
	                      type="text"
	                      placeholder="Search Family or Case..."
	                      value={filterText}
	                      onChange={(e) => setFilterText(e.target.value)}
	                      className="pl-9 pr-4 py-3 w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)] text-sm bg-white"
	                    />
	                    <span className="absolute left-3 top-3.5 text-gray-400">
		                      <LucideIcon name="Search" className="w-4 h-4" />
		                    </span>
			                  </div>
		                  {historyMode === "entries" && (
		                    <>
	                      <Button
	                        onClick={() => {
	                          const toPrint = filteredEntries.filter((e) => Boolean(selectedEntryIds?.[e.id]));
	                          printCaseNotes(toPrint);
	                        }}
	                        variant="secondary"
	                        iconName="Printer"
		                        className="text-sm whitespace-nowrap h-12 px-5 rounded-xl"
	                        disabled={!selectedCount}
		                        title="Print selected case notes"
		                      >
		                        Batch Print{selectedCount ? ` (${selectedCount})` : ""}
		                      </Button>
		                      {isAdmin && (
		                        <>
		                          <input
		                            type="file"
		                            id="entriesCsvFileInput"
		                            accept=".csv,text/csv"
		                            className="hidden"
		                            onChange={async (e) => {
		                              const file = e.target.files?.[0];
		                              if (!file) return;
		                              try {
		                                const text = await file.text();
		                                await importEntriesFromCsv(text, file.name);
		                              } catch (err) {
		                                showToast(`Import failed: ${err?.message || err}`);
		                              }
		                              e.target.value = "";
		                            }}
		                          />
		                          <Button
		                            onClick={() => document.getElementById("entriesCsvFileInput")?.click()}
		                            variant="secondary"
		                            iconName="Upload"
		                            className="text-sm whitespace-nowrap h-12 px-5 rounded-xl"
		                            disabled={importInProgress}
		                            title="Import case notes from CSV file"
		                          >
		                            Import CSV
		                          </Button>
		                          <Button onClick={downloadCSV} variant="secondary" iconName="Download" className="text-sm whitespace-nowrap h-12 px-5 rounded-xl">
		                            Export CSV
		                          </Button>
		                          <Button
		                            onClick={batchExportCaseNotes}
		                            variant="secondary"
		                            iconName="PackageOpen"
		                            className="text-sm whitespace-nowrap h-12 px-5 rounded-xl"
		                            disabled={batchExportLoading}
		                          >
		                            {batchExportLoading ? (batchExportProgress || "Exporting...") : "Batch Print All"}
		                          </Button>
		                        </>
		                      )}
		                    </>
		                  )}
		                  {historyMode === "profiles" && (
		                    <>
		                      {isAdmin && (
		                        <>
		                          <input
		                            type="file"
		                            id="csvFileInput"
		                            accept=".csv,text/csv"
		                            className="hidden"
		                            onChange={async (e) => {
		                              const file = e.target.files?.[0];
		                              if (!file) return;
		                              try {
		                                const text = await file.text();
		                                const imported = await importDirectoryFromCsvText(text, file.name, importMode, { navigateOnSuccess: false });
		                                if (imported > 0) {
		                                  showToast(`Imported ${imported} profiles from ${file.name}`);
		                                }
		                              } catch (err) {
		                                showToast(`Import failed: ${err?.message || err}`);
		                              }
		                              e.target.value = "";
		                            }}
		                          />
		                          <Button
		                            onClick={() => document.getElementById("csvFileInput")?.click()}
		                            variant="secondary"
		                            iconName="Upload"
		                            className="text-sm whitespace-nowrap h-12 px-5 rounded-xl"
		                            disabled={importInProgress}
		                            title="Import profiles from CSV file"
		                          >
		                            Import CSV
		                          </Button>
		                          <Button
		                            onClick={downloadProfilesCSV}
		                            variant="secondary"
		                            iconName="Download"
		                            className="text-sm whitespace-nowrap h-12 px-5 rounded-xl"
		                            title="Export profiles to CSV file"
		                          >
		                            Export CSV
		                          </Button>
		                        </>
		                      )}
		                    </>
		                  )}
		                </div>
		              </div>

	              {historyMode === "profiles" ? (
	                <div className="overflow-auto flex-grow p-0">
	                  <table className="min-w-full divide-y divide-gray-200 hidden md:table">
	                    <thead className="bg-gray-50 sticky top-0 z-10">
	                      <tr>
	                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family</th>
	                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Master Case #</th>
	                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
	                      </tr>
	                    </thead>
	                    <tbody className="bg-white divide-y divide-gray-200">
	                      {filteredProfiles.length === 0 ? (
	                        <tr>
	                          <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
	                            {filterText ? "No matching profiles found." : "No profiles yet."}
	                          </td>
	                        </tr>
	                      ) : (
	                        filteredProfiles.map((p) => (
	                          <tr key={p.key} className="hover:bg-blue-50 transition-colors">
	                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{p.caseName}</td>
	                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.mcNumber || "-"}</td>
		                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
		                              <div className="flex justify-end space-x-2">
		                                <button
		                                  onClick={() => {
		                                    setActiveTab("form");
		                                    setFormData((prev) => ({ ...prev, family_directory_key: p.key, family_id: p.familyId || p.key }));
		                                    setTimeout(() => maybeAutofillFromCase("history-use"), 0);
		                                  }}
		                                  className="text-[var(--brand-navy)] hover:text-slate-900 p-2 hover:bg-slate-100 rounded"
		                                  title="Use Profile"
		                                >
		                                  <LucideIcon name="ArrowRight" className="w-5 h-5" />
		                                </button>
		                                {isAdmin && (
		                                  <>
		                                    <button
		                                      onClick={() => {
		                                        setSelectedProfileKey(p.key);
		                                        setActiveTab("goals");
		                                      }}
		                                      className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded"
		                                      title="Edit Profile"
		                                    >
		                                      <LucideIcon name="Edit2" className="w-5 h-5" />
		                                    </button>
		                                    <button
		                                      onClick={() => deleteClientProfile(p.key)}
		                                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
		                                      title="Delete Profile"
		                                    >
		                                      <LucideIcon name="Trash2" className="w-5 h-5" />
		                                    </button>
		                                  </>
		                                )}
		                              </div>
		                            </td>
		                          </tr>
		                        ))
		                      )}
	                    </tbody>
	                  </table>
	
	                  <div className="md:hidden p-4 space-y-4">
	                    {filteredProfiles.map((p) => (
	                      <div key={p.key} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
	                        <div className="font-bold text-gray-900">{p.caseName}</div>
	                        <div className="text-xs text-gray-500 mb-2">Case: {p.mcNumber || "-"}</div>
		                        <div className="flex justify-end gap-2">
		                          <Button
		                            variant="secondary"
		                            className="text-sm"
	                            onClick={() => {
	                              setActiveTab("form");
	                              setFormData((prev) => ({ ...prev, family_directory_key: p.key, family_id: p.familyId || p.key }));
	                              setTimeout(() => maybeAutofillFromCase("history-use-mobile"), 0);
	                            }}
	                          >
	                            Use
	                          </Button>
		                          {isAdmin && (
		                            <>
		                              <Button
		                                variant="secondary"
		                                className="text-sm"
		                                onClick={() => {
		                                  setSelectedProfileKey(p.key);
		                                  setActiveTab("goals");
		                                }}
		                              >
		                                Edit
		                              </Button>
		                              <Button
		                                variant="danger"
		                                className="text-sm"
		                                onClick={() => deleteClientProfile(p.key)}
		                              >
		                                Delete
		                              </Button>
		                            </>
		                          )}
		                        </div>
		                      </div>
		                    ))}
		                  </div>
	                </div>
	              ) : (
	                <div className="overflow-auto flex-grow p-0">
		                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
	                  <thead className="bg-gray-50 sticky top-0 z-10">
	                    <tr>
	                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
	                        <input
	                          type="checkbox"
	                          checked={Boolean(filteredEntries.length) && filteredEntries.every((e) => Boolean(selectedEntryIds?.[e.id]))}
	                          onChange={(e) => toggleAllFiltered(e.target.checked)}
	                          title="Select all"
	                        />
	                      </th>
	                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
	                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
	                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family / Case #</th>
	                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
	                    </tr>
	                  </thead>
	                  <tbody className="bg-white divide-y divide-gray-200">
	                    {filteredEntries.length === 0 ? (
	                      <tr>
	                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
	                          {filterText ? "No matching records found." : "No entries yet."}
	                        </td>
	                      </tr>
	                    ) : (
	                      filteredEntries.map((entry) => (
	                        <tr key={entry.id} className="hover:bg-blue-50 transition-colors">
	                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
	                            <input
	                              type="checkbox"
	                              checked={Boolean(selectedEntryIds?.[entry.id])}
	                              onChange={(e) => {
	                                const checked = e.target.checked;
	                                setSelectedEntryIds((prev) => {
	                                  const next = { ...(prev || {}) };
	                                  if (checked) next[entry.id] = true;
	                                  else delete next[entry.id];
	                                  return next;
	                                });
	                              }}
	                              title="Select for batch print"
	                            />
	                          </td>
	                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
	                            {normalize(entry.date)} <span className="text-gray-400 text-xs ml-1">({formatTime12h(normalize(entry.start_time))})</span>
	                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.service_type?.startsWith("DST")
                                  ? "bg-purple-100 text-purple-800"
                                  : entry.service_type?.startsWith("PTSV")
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-green-100 text-green-800"
                              }`}
                            >
                              {normalize(entry.service_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-medium">{normalize(entry.family_name)}</div>
                            <div className="text-xs text-gray-500">{normalize(entry.master_case)}</div>
	                          </td>
		                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
		                            <div className="flex justify-end space-x-2">
		                              <button
		                                onClick={() => startEditEntry(entry)}
		                                className="text-[var(--brand-navy)] hover:text-slate-900 p-2 hover:bg-slate-100 rounded"
		                                title="Edit"
		                              >
		                                <LucideIcon name="Edit2" className="w-5 h-5" />
		                              </button>
		                              <button
		                                onClick={() => printCaseNotes([entry])}
		                                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded"
		                                title="Print Case Note"
		                              >
		                                <LucideIcon name="Printer" className="w-5 h-5" />
		                              </button>
		                              <button onClick={() => setPreviewNote(entry)} className="text-[var(--brand-navy)] hover:text-slate-900 p-2 hover:bg-slate-100 rounded" title="View Note">
		                                <LucideIcon name="FileText" className="w-5 h-5" />
		                              </button>
		                              <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-100 rounded" title="Delete">
		                                <LucideIcon name="Trash2" className="w-5 h-5" />
		                              </button>
		                            </div>
		                          </td>
	                        </tr>
	                      ))
	                    )}
	                  </tbody>
	                </table>

	                <div className="md:hidden p-4 space-y-4">
	                  {filteredEntries.map((entry) => (
	                    <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
	                      <div className="flex justify-between items-start mb-2 gap-3">
	                        <div>
	                          <div className="font-bold text-gray-900">{entry.family_name}</div>
	                          <div className="text-xs text-gray-500 mb-1">Case: {entry.master_case}</div>
	                          <div className="text-sm text-gray-500">
	                            {entry.date} • {formatTime12h(entry.start_time)}
	                          </div>
	                        </div>
	                        <div className="flex flex-col items-end gap-2">
	                          <input
	                            type="checkbox"
	                            checked={Boolean(selectedEntryIds?.[entry.id])}
	                            onChange={(e) => {
	                              const checked = e.target.checked;
	                              setSelectedEntryIds((prev) => {
	                                const next = { ...(prev || {}) };
	                                if (checked) next[entry.id] = true;
	                                else delete next[entry.id];
	                                return next;
	                              });
	                            }}
	                            title="Select for batch print"
	                          />
	                        <span
	                          className={`px-2 py-1 rounded text-xs font-bold ${
	                            entry.service_type?.startsWith("DST")
	                              ? "bg-purple-100 text-purple-800"
                              : entry.service_type?.startsWith("PTSV")
                                ? "bg-orange-100 text-orange-800"
                                : "bg-green-100 text-green-800"
                          }`}
	                        >
	                          {entry.service_type}
	                        </span>
	                        </div>
	                      </div>
		                      <div className="grid grid-cols-2 sm:flex sm:justify-end pt-2 border-t border-gray-100 gap-1 sm:gap-3">
		                        <button
		                          onClick={() => startEditEntry(entry)}
		                          className="text-[var(--brand-navy)] text-sm flex items-center justify-center px-2 py-2 hover:bg-slate-50 rounded"
		                        >
		                          <LucideIcon name="Edit2" className="w-4 h-4 mr-1" /> Edit
		                        </button>
		                        <button
		                          onClick={() => printCaseNotes([entry])}
		                          className="text-gray-700 text-sm flex items-center justify-center px-2 py-2 hover:bg-gray-50 rounded"
		                        >
	                          <LucideIcon name="Printer" className="w-4 h-4 mr-1" /> Print
	                        </button>
	                        <button onClick={() => setPreviewNote(entry)} className="text-[var(--brand-navy)] text-sm flex items-center justify-center px-2 py-2 hover:bg-slate-50 rounded">
	                          <LucideIcon name="FileText" className="w-4 h-4 mr-1" /> View
	                        </button>
	                        <button onClick={() => handleDelete(entry.id)} className="text-red-500 text-sm flex items-center justify-center px-2 py-2 hover:bg-red-50 rounded">
	                          <LucideIcon name="Trash2" className="w-4 h-4 mr-1" /> Delete
	                        </button>
	                      </div>
	                    </div>
	                  ))}
		                </div>

		                {/* Load More Button */}
		                {hasMoreEntries && (
		                  <div className="p-4 text-center border-t border-gray-200">
		                    <div className="flex justify-center gap-3 mb-2">
		                      <Button
		                        variant="secondary"
		                        onClick={() => setEntriesLimit((prev) => prev + APP_CONSTANTS.ENTRIES_LIMIT_DEFAULT)}
		                        className="px-6"
		                      >
		                        Load More (+{APP_CONSTANTS.ENTRIES_LIMIT_DEFAULT})
		                      </Button>
		                      <Button
		                        variant="secondary"
		                        onClick={() => setEntriesLimit(9999)}
		                        className="px-6"
		                      >
		                        Load All
		                      </Button>
		                    </div>
		                    <div className="text-xs text-gray-500">
		                      Showing {filteredEntries.length} entries (loaded {entries.length} from database)
		                    </div>
		                  </div>
		                )}
	              </div>
	            )}
	            {NotePreviewModal()}
	          </div>
	          );
	        };

		      const GoalsView = () => (
		        <div className="w-full mb-20">
		          {/* Full-width Client Profile Editor */}
		          <ClientProfileEditor
		            key={`profiles-editor-${profilesResetNonce}`}
		            familyDirectoryOptions={filteredFamilyDirectoryOptions}
		            allFamilyDirectoryOptions={familyDirectoryOptions}
		            selectedProfileKey={selectedProfileKey}
		            onSelectProfileKey={setSelectedProfileKey}
		            onSaveProfile={upsertClientProfile}
		            onToast={showToast}
		            onAfterSave={resetForNewProfile}
		            initialDraft={aiProfileSeed?.profile || null}
		            initialGoals={aiProfileSeed?.goals || null}
		            entries={entries}
		            showArchivedProfiles={showArchivedProfiles}
		            setShowArchivedProfiles={setShowArchivedProfiles}
		            DISCHARGE_STATUS_OPTIONS={DISCHARGE_STATUS_OPTIONS}
		            getDischargeLabel={getDischargeLabel}
		          />
		        </div>
		      );

      const AdminView = () => {
        const startEditProfile = (profile) => {
          setAdminEditingProfile(profile.key);
          setAdminProfileDraft({
            Family_ID: profile.familyId || "",
            Case_Name: profile.caseName || "",
            MC_Number: profile.mcNumber || "",
            CFSS: profile.cfss || "",
            Typical_Location: (profile.profileLocations || []).join(", "),
            Parent_1: profile.parents?.[0] || "",
            Parent_2: profile.parents?.[1] || "",
            Parent_3: profile.parents?.[2] || "",
            Parent_1_Gender: profile.raw?.Parent_1_Gender || "",
            Parent_2_Gender: profile.raw?.Parent_2_Gender || "",
            Parent_3_Gender: profile.raw?.Parent_3_Gender || "",
            Parent_1_Relationship: profile.raw?.Parent_1_Relationship || "",
            Parent_1_Age_Range: profile.raw?.Parent_1_Age_Range || "",
            Parent_2_Relationship: profile.raw?.Parent_2_Relationship || "",
            Parent_2_Age_Range: profile.raw?.Parent_2_Age_Range || "",
            Parent_3_Relationship: profile.raw?.Parent_3_Relationship || "",
            Parent_3_Age_Range: profile.raw?.Parent_3_Age_Range || "",
            Head_of_Household: profile.raw?.Head_of_Household || "",
            Household_Type: profile.raw?.Household_Type || "",
            Poverty_Level: profile.raw?.Poverty_Level || "",
            Child_1: profile.children?.[0] || "",
            Child_2: profile.children?.[1] || "",
            Child_3: profile.children?.[2] || "",
            Child_4: profile.children?.[3] || "",
            Child_5: profile.children?.[4] || "",
            Child_6: profile.children?.[5] || "",
            Child_7: profile.children?.[6] || "",
            Child_1_Gender: profile.raw?.Child_1_Gender || "",
            Child_1_Age_Range: profile.raw?.Child_1_Age_Range || "",
            Child_2_Gender: profile.raw?.Child_2_Gender || "",
            Child_2_Age_Range: profile.raw?.Child_2_Age_Range || "",
            Child_3_Gender: profile.raw?.Child_3_Gender || "",
            Child_3_Age_Range: profile.raw?.Child_3_Age_Range || "",
            Child_4_Gender: profile.raw?.Child_4_Gender || "",
            Child_4_Age_Range: profile.raw?.Child_4_Age_Range || "",
            Child_5_Gender: profile.raw?.Child_5_Gender || "",
            Child_5_Age_Range: profile.raw?.Child_5_Age_Range || "",
            Child_6_Gender: profile.raw?.Child_6_Gender || "",
            Child_6_Age_Range: profile.raw?.Child_6_Age_Range || "",
            Child_7_Gender: profile.raw?.Child_7_Gender || "",
            Child_7_Age_Range: profile.raw?.Child_7_Age_Range || "",
            Service_Start_Date: profile.raw?.Service_Start_Date || "",
            Service_End_Date: profile.raw?.Service_End_Date || "",
          });
          setAdminGoalsDraft(profile.goals || []);
        };

        const saveEditedProfile = async () => {
          if (!adminEditingProfile) return;
          const profileData = {
            ...adminProfileDraft,
            goals: adminGoalsDraft.filter(g => g.trim()),
          };
          await upsertClientProfile(profileData, adminEditingProfile);
          setAdminEditingProfile(null);
          setAdminProfileDraft({});
          setAdminGoalsDraft([]);
          showToast("Profile updated");
        };

        const deleteProfile = async (profileKey) => {
          // Get profile details for audit log
          const profileToDelete = caseDirectory.find(p => p.key === profileKey);

          // Log delete attempt
          await logAuditEvent("delete_attempt", "profile", {
            profile_id: profileKey,
            case_name: profileToDelete?.caseName || "unknown",
            mc_number: profileToDelete?.mcNumber || "unknown",
          });

          if (!confirm("Delete this profile? This cannot be undone.")) return;
          try {
            await sharedCaseDirectoryRef.doc(profileKey).delete();

            // Log successful deletion
            await logAuditEvent("deleted", "profile", {
              profile_id: profileKey,
              case_name: profileToDelete?.caseName || "unknown",
              mc_number: profileToDelete?.mcNumber || "unknown",
            });

            showToast("Profile deleted");
          } catch (err) {
            showToast("Error deleting profile");
          }
        };

        const toggleSection = (sectionKey) => {
          setAdminExpandedSections(prev => ({
            ...prev,
            [sectionKey]: prev[sectionKey] === undefined ? false : !prev[sectionKey]
          }));
        };
        const isSectionExpanded = (sectionKey) => adminExpandedSections[sectionKey] !== false;

        const openAdminBrandedReport = ({ title, subtitle, metaLines, text, fileName }) => {
          if (!text) return;
          const printWindow = window.open("", "_blank", "width=850,height=700");
          if (!printWindow) { showToast("Pop-up blocked — please allow pop-ups for this site."); return; }
          const cleanMarkdown = (str) => str.replace(/\*\*\*(.*?)\*\*\*/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/^[-*]\s+/gm, "- ").replace(/`([^`]+)`/g, "$1");
          const cleanedText = cleanMarkdown(text);
          const lines = cleanedText.split("\n");
          let sections = [];
          let currentSection = { title: "", content: "" };
          for (const line of lines) {
            const trimmed = line.trim();
            const isAllCapsHeader = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed) && !/^\d+\.$/.test(trimmed);
            const numberedMatch = trimmed.match(/^\d+\.\s+([A-Z][A-Z\s&—\-:]+)$/);
            if (isAllCapsHeader || numberedMatch) {
              if (currentSection.title || currentSection.content.trim()) sections.push({ ...currentSection });
              currentSection = { title: numberedMatch ? numberedMatch[1].trim() : trimmed, content: "" };
            } else { currentSection.content += line + "\n"; }
          }
          if (currentSection.title || currentSection.content.trim()) sections.push(currentSection);
          let sectionsHtml = "";
          if (sections.length > 1) {
            for (const section of sections) {
              if (section.title) sectionsHtml += `<div class="section-title">${section.title}</div>`;
              if (section.content.trim()) sectionsHtml += `<div class="section-content">${section.content.trim().replace(/\n/g, "<br/>")}</div>`;
            }
          } else { sectionsHtml = `<div class="section-content">${text.replace(/\n/g, "<br/>")}</div>`; }
          const metaHtml = (metaLines || []).filter(Boolean).join("<br/>");
          printWindow.document.write(`<!DOCTYPE html><html><head><title>${fileName || title + " - Epworth Family Resources"}</title><style>@page{size:letter;margin:0.5in}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;color:#1a1a1a;background:#f8fafc}.report-container{max-width:800px;margin:0 auto;background:white;min-height:100vh}.header{background:linear-gradient(135deg,#1e3a5f 0%,#2d4a6f 100%);color:white;padding:24px 32px;display:flex;justify-content:space-between;align-items:center}.header-left h1{font-size:22px;font-weight:700;letter-spacing:-0.5px}.header-left .subtitle{margin-top:4px;font-size:13px;opacity:0.85;font-weight:400}.header-right{text-align:right}.header-right .org{font-size:14px;font-weight:600;opacity:0.95}.header-right .date{font-size:12px;opacity:0.75;margin-top:2px}.content-area{padding:24px 32px}.meta-block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#64748b;line-height:1.7}.section-title{font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}.section-title:first-child{margin-top:0}.section-content{font-size:13px;line-height:1.7;color:#374151;margin-bottom:12px}.footer{margin-top:32px;padding-top:16px;border-top:2px solid #c89a2a;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af}.footer .confidential{color:#c89a2a;font-weight:700;font-size:11px}.actions{padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:8px}.btn{padding:10px 20px;cursor:pointer;background:#1e3a5f;color:white;border:none;border-radius:6px;font-weight:600;font-size:13px}.btn:hover{background:#162036}.btn-secondary{background:white;color:#1e3a5f;border:1px solid #1e3a5f}.btn-secondary:hover{background:#f1f5f9}@media print{body{background:white}.actions{display:none}.report-container{box-shadow:none}}</style></head><body><div class="report-container"><div class="header"><div class="header-left"><h1>${title}</h1><div class="subtitle">${subtitle}</div></div><div class="header-right"><div class="org">Epworth Family Resources</div><div class="date">Generated ${new Date().toLocaleDateString()}</div></div></div><div class="content-area">${metaHtml ? `<div class="meta-block">${metaHtml}</div>` : ""}${sectionsHtml}<div class="footer"><div class="confidential">CONFIDENTIAL — FOR INTERNAL USE ONLY</div><div>Epworth Family Resources</div></div></div><div class="actions"><button class="btn" onclick="window.print()">Print Report</button><button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.querySelector('.content-area').innerText).then(()=>alert('Copied!'))">Copy Text</button></div></div><scr` + `ipt>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},800)};</scr` + `ipt></body></html>`);
          printWindow.document.close();
        };

        const adminTabs = [
          { key: "overview", label: "Overview", icon: "LayoutDashboard" },
          { key: "clients", label: "Clients & Workers", icon: "Users" },
          { key: "data", label: "Data & Reports", icon: "BarChart3" },
        ];

        return (
          <div className="w-full space-y-6 mb-20">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center mb-2">
                <LucideIcon name="Settings" className="w-8 h-8 text-[var(--brand-navy)] mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
              </div>
              <p className="text-gray-500 text-sm">Manage workers, parse case notes with AI, and edit client profiles.</p>
            </div>

            {/* Sub-Tab Bar */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-fit">
              {adminTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAdminSubTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    adminSubTab === tab.key
                      ? "bg-[var(--brand-navy)] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <LucideIcon name={tab.icon} className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ===== OVERVIEW TAB ===== */}
            {adminSubTab === "overview" && (<>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection("quickActions")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("quickActions") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-gray-500" />
                  <LucideIcon name="Zap" className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-gray-800">Quick Actions</h3>
                </div>
              </button>
              {isSectionExpanded("quickActions") && (
                <div className="border-t border-gray-200 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  iconName="Plus"
                  onClick={() => {
                    resetForNewEntry();
                    setActiveTab("form");
                  }}
                  className="justify-start"
                >
                  New Case Note Entry
                </Button>
                <Button
                  variant="secondary"
                  iconName="Target"
                  onClick={() => {
                    resetForNewProfile();
                    setActiveTab("goals");
                  }}
                  className="justify-start"
                >
                  New Client Profile
                </Button>
                <Button
                  variant="secondary"
                  iconName="Table"
                  onClick={() => setActiveTab("table")}
                  className="justify-start"
                >
                  View History
                </Button>
                <Button
                  variant="secondary"
                  iconName="Download"
                  onClick={exportEntriesToCsv}
                  className="justify-start"
                >
                  Export Entries CSV
                </Button>
              </div>
                </div>
              )}
            </div>

            {/* AI Case Note Parser */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection("aiParser")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("aiParser") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-gray-500" />
                  <LucideIcon name="Sparkles" className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-800">AI Case Note Parser</h3>
                </div>
              </button>
              {isSectionExpanded("aiParser") && (
                <div className="border-t border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-3">
                Paste rough notes, voice transcription, or any messy text. AI will detect the service type and fill appropriate fields.
              </p>
              <textarea
                value={aiCaseNoteText}
                onChange={(e) => setAiCaseNoteText(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                placeholder="Example: IHFS visit with Smith family on Dec 15 at 2pm, worked on communication goals, made moderate progress..."
              />
              {aiParseError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2" role="alert">
                  <LucideIcon name="AlertCircle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{aiParseError}</p>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                      onClick={() => setAiParseError("")}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAiCaseNoteText("");
                    setAiParseError("");
                  }}
                  disabled={parsingCaseNote || !aiCaseNoteText}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  iconName="Sparkles"
                  onClick={async () => {
                    await applyCaseNoteParse();
                    setActiveTab("form");
                  }}
                  disabled={parsingCaseNote || !aiCaseNoteText}
                >
                  {parsingCaseNote ? "Parsing..." : "Parse & Go to Entry"}
                </Button>
              </div>
                </div>
              )}
            </div>

            {/* AI Case Analysis */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection("caseAnalysis")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("caseAnalysis") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-gray-500" />
                  <LucideIcon name="Brain" className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">AI Case Analysis</h3>
                    <p className="text-sm text-gray-500">Deep analysis of a case — concerns, patterns, communications, and testing</p>
                  </div>
                </div>
              </button>
              {isSectionExpanded("caseAnalysis") && (
                <div className="border-t border-gray-200 p-6 space-y-4">
                  <p className="text-sm text-gray-600">
                    Select a family to run a thorough AI analysis across all case data — visit notes, phone calls, texts, emails, drug testing results, safety concerns, and more.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Family</label>
                    <select
                      value={caseAnalysisFamily}
                      onChange={(e) => setCaseAnalysisFamily(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="">— Choose a family —</option>
                      {familyDirectoryOptions.filter(o => !o.isArchived).map(o => (
                        <option key={o.key} value={o.key}>{o.caseName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      iconName="Brain"
                      disabled={caseAnalysisLoading || !caseAnalysisFamily}
                      onClick={async () => {
                        setCaseAnalysisLoading(true);
                        setCaseAnalysisResult("");

                        const truncate = (text, max = 500) => {
                          const s = String(text || "").trim();
                          return s.length > max ? s.slice(0, max) + "..." : s;
                        };

                        const familyOpt = familyDirectoryOptions.find(f => f.key === caseAnalysisFamily);
                        const familyEntries = entries.filter(e => !e.is_archived && entryMatchesClient(e, caseAnalysisFamily));

                        // Build rich data including all contact types
                        const visitData = familyEntries.slice(0, 40).map(e => {
                          const base = {
                            date: e.date,
                            serviceType: e.service_type,
                            contactType: e.contact_type,
                            worker: e.worker_name,
                            narrative: truncate(e.visit_narrative, 500),
                            interventions: truncate(e.interventions, 300),
                            plan: truncate(e.plan, 300),
                            interactions: truncate(e.interactions, 300),
                            parentingSkills: truncate(e.parenting_skills, 300),
                            goalsProgress: truncate(e.goals_progress, 300),
                            safetyConcern: e.safety_concern_present,
                            safetyConcernDesc: truncate(e.safety_concern_description, 300),
                            participants: e.participants || "",
                          };
                          // Drug testing
                          if (e.chain_of_custody) base.chainOfCustody = e.chain_of_custody;
                          if (e.test_result) base.testResult = e.test_result;
                          if (e.sp_test_result) base.sweatPatchResult = e.sp_test_result;
                          if (e.drugs_tested_positive) base.drugsTestedPositive = e.drugs_tested_positive;
                          if (e.sp_drugs_tested_positive) base.spDrugsTestedPositive = e.sp_drugs_tested_positive;
                          if (e.client_admitted_use) base.clientAdmittedUse = e.client_admitted_use;
                          if (e.sp_client_admitted_use) base.spClientAdmittedUse = e.sp_client_admitted_use;
                          if (e.non_admission_explanation) base.nonAdmissionExplanation = truncate(e.non_admission_explanation, 300);
                          if (e.sp_non_admission_explanation) base.spNonAdmissionExplanation = truncate(e.sp_non_admission_explanation, 300);
                          if (e.refusal_reason) base.refusalReason = truncate(e.refusal_reason, 300);
                          if (e.sp_tampered_explanation) base.tamperedExplanation = truncate(e.sp_tampered_explanation, 300);
                          if (e.patch_removed) base.patchRemoved = e.patch_removed;
                          if (e.new_patch_applied) base.newPatchApplied = e.new_patch_applied;
                          if (e.test_mailed) base.testMailed = e.test_mailed;
                          if (e.sp_date_sent) base.dateSent = e.sp_date_sent;
                          // Cancellation
                          if (e.cancellation_notification) base.cancellationNotification = truncate(e.cancellation_notification, 300);
                          if (e.cancellation_pre_call) base.cancellationPreCall = truncate(e.cancellation_pre_call, 300);
                          if (e.cancellation_en_route) base.cancellationEnRoute = e.cancellation_en_route;
                          if (e.cancellation_will_makeup) base.willMakeup = e.cancellation_will_makeup;
                          if (e.cancellation_makeup_date) base.makeupDate = e.cancellation_makeup_date;
                          // Engagement
                          if (e.client_admission) base.clientAdmission = truncate(e.client_admission, 300);
                          if (e.engagement) base.engagement = truncate(e.engagement, 300);
                          return base;
                        });

                        // Separate entries by communication type for clarity in the prompt
                        const phoneEntries = visitData.filter(e => e.contactType === "Phone Call");
                        const textEntries = visitData.filter(e => e.contactType === "Text Message");
                        const visitEntries = visitData.filter(e => e.contactType === "Face-to-Face Visit" || e.contactType === "Monitored Visit" || e.contactType === "Virtual Visit");
                        const cancelledEntries = visitData.filter(e => (e.contactType || "").includes("Cancelled") || (e.contactType || "").includes("No Show"));
                        const drugTestEntries = visitData.filter(e => (e.serviceType || "").startsWith("DST"));
                        const otherEntries = visitData.filter(e => !phoneEntries.includes(e) && !textEntries.includes(e) && !visitEntries.includes(e) && !cancelledEntries.includes(e) && !drugTestEntries.includes(e));

                        // Build family profile info
                        const profile = familyOpt?.raw || {};
                        const profileInfo = {
                          caseName: familyOpt?.caseName || "",
                          mcNumber: familyOpt?.mcNumber || "",
                          parents: [profile.Parent_1, profile.Parent_2, profile.Parent_3].filter(Boolean),
                          children: [profile.Child_1, profile.Child_2, profile.Child_3, profile.Child_4, profile.Child_5].filter(Boolean),
                          goals: familyOpt?.goals || [],
                          serviceStartDate: profile.Service_Start_Date || "",
                          povertyLevel: profile.Poverty_Level || "",
                          householdType: profile.Household_Type || "",
                        };

                        // Authorization history
                        const authHistory = Array.isArray(profile.Authorization_History) ? profile.Authorization_History : [];

                        const totalNote = familyEntries.length > 40 ? `\n\nNote: Showing 40 of ${familyEntries.length} total entries.` : "";

                        const prompt = `Run a thorough case analysis for this family. This is for an admin/supervisor review — be detailed, honest, and flag anything that needs attention.${totalNote}\n\nFAMILY PROFILE:\n${JSON.stringify(profileInfo)}\n\nAUTHORIZATION HISTORY:\n${JSON.stringify(authHistory)}\n\nIN-PERSON & VIRTUAL VISITS (${visitEntries.length}):\n${JSON.stringify(visitEntries)}\n\nPHONE CALLS (${phoneEntries.length}):\n${JSON.stringify(phoneEntries)}\n\nTEXT MESSAGES (${textEntries.length}):\n${JSON.stringify(textEntries)}\n\nDRUG TESTING (${drugTestEntries.length}):\n${JSON.stringify(drugTestEntries)}\n\nCANCELLATIONS & NO-SHOWS (${cancelledEntries.length}):\n${JSON.stringify(cancelledEntries)}\n\n${otherEntries.length > 0 ? `OTHER CONTACTS (${otherEntries.length}):\n${JSON.stringify(otherEntries)}\n\n` : ""}Analyze ALL of the above data. Use ALL CAPS for section headers. Cover:\n\nCASE OVERVIEW\n- Family composition, services, workers, how long services have been active\n\nCOMMUNICATIONS ANALYSIS\n- What do the phone calls, texts, and emails reveal? Patterns in communication — is the family responsive? Initiating contact? Avoiding it?\n- Notable things said or documented in phone/text contacts\n- Any red flags or positive indicators from communications\n\nVISIT OBSERVATIONS\n- Key themes across in-person and virtual visits\n- What are workers observing in the home? What interactions are documented?\n- Parenting skills observed, engagement level during visits\n\nDRUG TESTING SUMMARY\n- Chronological summary of all test results with dates, types, and outcomes\n- Patterns — are results consistent? Trending in a direction?\n- Refusals, tampering, or admissions documented\n- If no drug testing data exists, note that\n\nSAFETY CONCERNS\n- Every safety concern documented, with dates and how it was addressed\n- Patterns — recurring issues, escalation, or improvement\n- Protective factors vs risk factors\n\nCANCELLATION & ENGAGEMENT PATTERNS\n- How often are visits being cancelled? By whom?\n- No-shows, makeups, patterns (certain days, after certain events)\n- Overall engagement trajectory — getting better or worse?\n\nGOAL PROGRESS\n- Status of each goal\n- What's being worked on, what's stalled\n- Connection between goals and actual visit activities\n\nCONCERNS & RED FLAGS\n- Anything that stands out as concerning — be direct\n- Things that don't add up or need a closer look\n- Compliance issues, engagement drops, safety patterns\n\nSTRENGTHS & POSITIVE INDICATORS\n- What's going well? What does this family do right?\n- Progress that should be recognized\n\nRECOMMENDATIONS\n- What should the team focus on next?\n- Service adjustments, safety planning, goal changes\n- Anything that needs immediate attention\n\nBe specific — cite dates, quotes from narratives, actual test results. This is a supervisor-level review.`;

                        try {
                          const response = await authFetch("/api/generateReport", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ prompt }),
                          });
                          const result = await response.json().catch(() => ({}));
                          if (!response.ok || result?.error) throw new Error(result?.error || `API error: ${response.status}`);
                          setCaseAnalysisResult(result?.text || "Unable to generate analysis.");
                        } catch (err) {
                          showToast("Failed to generate case analysis: " + (err?.message || "Unknown error"));
                        } finally {
                          setCaseAnalysisLoading(false);
                        }
                      }}
                    >
                      {caseAnalysisLoading ? "Analyzing..." : "Run Case Analysis"}
                    </Button>
                  </div>

                  {caseAnalysisResult && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">Analysis Results</h4>
                        <div className="flex gap-2">
                          <Button variant="secondary" iconName="Copy" onClick={() => { navigator.clipboard.writeText(caseAnalysisResult); showToast("Copied!"); }}>
                            Copy
                          </Button>
                          <Button variant="secondary" iconName="Printer" onClick={() => {
                            const adminFamilyProfile = familyDirectoryOptions.find(f => f.key === caseAnalysisFamily);
                            const familyName = adminFamilyProfile?.caseName || caseAnalysisFamily;
                            openAdminBrandedReport({
                              title: "AI Case Analysis",
                              subtitle: familyName,
                              metaLines: [
                                `Family: ${familyName}`,
                                `Generated: ${new Date().toLocaleDateString()}`,
                                `Total Entries Analyzed: ${entries.filter(e => !e.is_archived && entryMatchesClient(e, caseAnalysisFamily)).length}`,
                              ],
                              text: caseAnalysisResult,
                              fileName: buildReportFileName({
                                familyName: adminFamilyProfile?.caseName || "",
                                mcNumber: adminFamilyProfile?.mcNumber || "",
                                serviceTypes: "",
                                month: new Date().toLocaleString("en-US", { month: "long" }),
                                year: String(new Date().getFullYear()),
                                reportType: "AI Case Analysis",
                              }),
                            });
                          }}>
                            Print
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          {caseAnalysisResult.split("\n").map((line, i) => {
                            const trimmed = line.trim();
                            const clean = trimmed.replace(/\*\*\*(.*?)\*\*\*/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
                            const isHeader = clean.length > 2 && clean === clean.toUpperCase() && /[A-Z]{3,}/.test(clean) && !/^\d+\.$/.test(clean);
                            const numMatch = clean.match(/^\d+\.\s+([A-Z][A-Z\s&—\-:]+)$/);
                            if (isHeader || numMatch) {
                              return <div key={i} className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wide mt-4 mb-1 pb-1 border-b border-gray-200">{numMatch ? numMatch[1] : clean}</div>;
                            }
                            if (!clean) return <div key={i} className="h-2" />;
                            return <div key={i} className="text-sm text-gray-700 leading-relaxed">{clean}</div>;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Monthly Reports Quick Link */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-lg border border-blue-200 overflow-hidden">
              <button onClick={() => toggleSection("reportsLink")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-blue-100/50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("reportsLink") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-blue-500" />
                  <LucideIcon name="FileText" className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Monthly Summary Reports</h3>
                    <p className="text-sm text-gray-600">Create professional monthly reports matching your Word templates</p>
                  </div>
                </div>
              </button>
              {isSectionExpanded("reportsLink") && (
                <div className="border-t border-blue-200 p-6">
                  <Button
                    variant="primary"
                    iconName="ArrowRight"
                    onClick={() => setActiveTab("reports")}
                  >
                    Go to Reports
                  </Button>
                </div>
              )}
            </div>

            </>)}

            {/* ===== CLIENTS & WORKERS TAB ===== */}
            {adminSubTab === "clients" && (<>

            {/* Worker Management */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection("workers")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("workers") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-gray-500" />
                  <LucideIcon name="Users" className="w-5 h-5 text-[var(--brand-navy)]" />
                  <h3 className="text-lg font-bold text-gray-800">Workers</h3>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{WORKER_NAMES.length}</span>
                </div>
              </button>
              {isSectionExpanded("workers") && (
                <div className="border-t border-gray-200 p-6">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  id="adminNewWorkerInput"
                  placeholder="New worker name..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (addWorker(e.target.value)) {
                        e.target.value = "";
                        showToast("Worker added");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="primary"
                  iconName="Plus"
                  onClick={() => {
                    const input = document.getElementById("adminNewWorkerInput");
                    if (input && addWorker(input.value)) {
                      input.value = "";
                      showToast("Worker added");
                    }
                  }}
                >
                  Add Worker
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WORKER_NAMES.map((name) => (
                  <div key={name} className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg">
                    <span className="font-medium text-gray-800">{name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove "${name}" from the worker list?`)) {
                          removeWorker(name);
                          showToast("Worker removed");
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                      title="Remove worker"
                    >
                      <LucideIcon name="Trash2" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Workers are saved to your browser and appear in the Worker Name dropdown.</p>
                </div>
              )}
            </div>

            {/* Client Profiles */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection("profiles")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("profiles") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-gray-500" />
                  <LucideIcon name="Users" className="w-5 h-5 text-[var(--brand-navy)]" />
                  <h3 className="text-lg font-bold text-gray-800">Client Profiles</h3>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{familyDirectoryOptions.length} profiles</span>
                </div>
              </button>
              {isSectionExpanded("profiles") && (
                <div className="border-t border-gray-200">
            <div className="bg-white rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[var(--brand-navy)] to-[#2a3a5c] px-8 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <LucideIcon name="Users" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Client Profiles</h3>
                      <p className="text-sm text-white/70">{familyDirectoryOptions.length} profiles loaded</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    iconName="Plus"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => {
                      resetForNewProfile();
                      setActiveTab("goals");
                    }}
                  >
                    Add New Profile
                  </Button>
                </div>
              </div>

              {/* Editing Form */}
              {adminEditingProfile ? (
                <div className="border-b border-blue-200 bg-blue-50 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <LucideIcon name="Edit2" className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-blue-800">Editing Profile</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Case Name"
                      value={adminProfileDraft.Case_Name || ""}
                      onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, Case_Name: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                    <input
                      type="text"
                      placeholder="MC Number"
                      value={adminProfileDraft.MC_Number || ""}
                      onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, MC_Number: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                    <input
                      type="text"
                      placeholder="CFSS"
                      value={adminProfileDraft.CFSS || ""}
                      onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, CFSS: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                    <input
                      type="text"
                      placeholder="Typical Location"
                      value={adminProfileDraft.Typical_Location || ""}
                      onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, Typical_Location: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Parent 1"
                      value={adminProfileDraft.Parent_1 || ""}
                      onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, Parent_1: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                    <input
                      type="text"
                      placeholder="Parent 2"
                      value={adminProfileDraft.Parent_2 || ""}
                      onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, Parent_2: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                    <input
                      type="text"
                      placeholder="Parent 3"
                      value={adminProfileDraft.Parent_3 || ""}
                      onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, Parent_3: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Goals (one per line)</label>
                    <textarea
                      rows={3}
                      value={adminGoalsDraft.join("\n")}
                      onChange={(e) => setAdminGoalsDraft(e.target.value.split("\n"))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                      placeholder="Enter goals, one per line..."
                    />
                  </div>
                  {/* Service Tracking Dates */}
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Service Tracking Dates</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Service Start Date</label>
                        <input
                          type="date"
                          value={adminProfileDraft.Service_Start_Date || ""}
                          onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, Service_Start_Date: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Service End Date</label>
                        <input
                          type="date"
                          value={adminProfileDraft.Service_End_Date || ""}
                          onChange={(e) => setAdminProfileDraft(prev => ({ ...prev, Service_End_Date: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-[var(--brand-navy)]"
                        />
                      </div>
                    </div>
                    {/* Service Duration Display */}
                    {adminProfileDraft.Service_Start_Date && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-800">
                          <strong>Service Duration:</strong>{" "}
                          {(() => {
                            const start = new Date(adminProfileDraft.Service_Start_Date);
                            const end = adminProfileDraft.Service_End_Date ? new Date(adminProfileDraft.Service_End_Date) : new Date();
                            const diffTime = Math.abs(end - start);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const months = Math.floor(diffDays / 30);
                            const days = diffDays % 30;
                            if (months > 0) {
                              return `${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
                            }
                            return `${days} day${days !== 1 ? 's' : ''}`;
                          })()}
                          {!adminProfileDraft.Service_End_Date && " (ongoing)"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setAdminEditingProfile(null)}>Cancel</Button>
                    <Button variant="primary" iconName="Save" onClick={saveEditedProfile}>Save Changes</Button>
                  </div>
                </div>
              ) : null}

              {/* Profiles Table */}
              <div className="overflow-x-auto">
                {familyDirectoryOptions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <LucideIcon name="Users" className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No client profiles yet</p>
                    <p className="text-sm text-gray-400 mt-1">Add profiles in the Client Profiles tab to get started</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">Case / Family Name</th>
                        <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">Master Case #</th>
                        <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">Family ID</th>
                        <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">CFSS</th>
                        <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">Poverty Level</th>
                        <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">Goals</th>
                        <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">Service Duration</th>
                        <th className="text-right text-xs font-bold text-gray-600 uppercase tracking-wider px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {familyDirectoryOptions.map((profile, idx) => (
                        <tr key={profile.key} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{profile.caseName || "Unnamed"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-700 font-mono text-sm">{profile.mcNumber || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-700 font-mono text-sm">{profile.familyId || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-700 font-mono text-sm">{profile.cfss || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            {profile.raw?.Poverty_Level ? (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                profile.raw.Poverty_Level === "Below Poverty Level"
                                  ? "bg-red-100 text-red-800"
                                  : profile.raw.Poverty_Level === "At Poverty Level"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-green-100 text-green-800"
                              }`}>
                                {profile.raw.Poverty_Level.replace(" Poverty Level", "")}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {profile.goals?.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {profile.goals.length} goal{profile.goals.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {profile.raw?.Service_Start_Date ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {(() => {
                                  const start = new Date(profile.raw.Service_Start_Date);
                                  const end = profile.raw.Service_End_Date ? new Date(profile.raw.Service_End_Date) : new Date();
                                  const diffTime = Math.abs(end - start);
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  const months = Math.floor(diffDays / 30);
                                  const days = diffDays % 30;
                                  if (months > 0) {
                                    return `${months}m ${days}d`;
                                  }
                                  return `${days}d`;
                                })()}
                                {!profile.raw.Service_End_Date && " ●"}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEditProfile(profile)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit profile"
                              >
                                <LucideIcon name="Edit2" className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProfile(profile.key)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete profile"
                              >
                                <LucideIcon name="Trash2" className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
                </div>
              )}
            </div>

            </>)}

            {/* ===== DATA & REPORTS TAB ===== */}
            {adminSubTab === "data" && (<>

            {/* Data Management */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection("dataManagement")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("dataManagement") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-gray-500" />
                  <LucideIcon name="Database" className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">Data Management</h3>
                </div>
              </button>
              {isSectionExpanded("dataManagement") && (
                <div className="border-t border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-4">
                Export all your data (entries + profiles) as JSON for backup or migration to another Firestore project.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-700 mb-2">
                  <strong>Current Data:</strong>
                </div>
                <div className="text-sm text-gray-600">
                  • {entries.length} case note entries
                </div>
                <div className="text-sm text-gray-600">
                  • {familyDirectoryOptions.length} client profiles
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Button
                  variant="primary"
                  iconName="Download"
                  onClick={() => {
                    const exportData = {
                      exportedAt: new Date().toISOString(),
                      appId: appId,
                      entries: entries,
                      profiles: caseDirectory,
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `epworth-backup-${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast("Data exported successfully");
                  }}
                >
                  Export All Data (JSON)
                </Button>
                <Button
                  variant="secondary"
                  iconName="Upload"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Validate file size before reading
                      const maxBytes = APP_CONSTANTS.MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024;
                      if (file.size > maxBytes) {
                        showToast(`File too large (max ${APP_CONSTANTS.MAX_IMPORT_FILE_SIZE_MB}MB)`);
                        return;
                      }

                      try {
                        const text = await file.text();
                        let data;
                        try {
                          data = JSON.parse(text);
                        } catch (parseErr) {
                          showToast("Invalid JSON file - could not parse");
                          return;
                        }

                        // Validate import data structure and limits
                        const validationErrors = validateImportData(data, file.size);
                        if (validationErrors.length > 0) {
                          showToast(`Import validation failed: ${validationErrors.join("; ")}`);
                          return;
                        }

                        const importEntries = Array.isArray(data.entries) ? data.entries : [];
                        const importProfiles = Array.isArray(data.profiles) ? data.profiles : [];

                        if (importEntries.length === 0 && importProfiles.length === 0) {
                          showToast("No valid entries or profiles found in file");
                          return;
                        }

                        if (!confirm(`Import ${importEntries.length} entries and ${importProfiles.length} profiles? This will ADD to existing data.`)) {
                          return;
                        }

                        let imported = 0;
                        let failed = 0;

                        // Import entries with progress
                        for (const entry of importEntries) {
                          if (!entry.id || typeof entry.id !== "string") {
                            failed++;
                            continue;
                          }
                          try {
                            await entriesRef.doc(entry.id).set(entry, { merge: true });
                            imported++;
                          } catch (err) {
                            console.error("Failed to import entry:", entry.id, err);
                            failed++;
                          }
                        }
                        // Import profiles
                        for (const profile of importProfiles) {
                          if (!profile.id || typeof profile.id !== "string") {
                            failed++;
                            continue;
                          }
                          try {
                            await sharedCaseDirectoryRef.doc(profile.id).set(profile, { merge: true });
                            imported++;
                          } catch (err) {
                            console.error("Failed to import profile:", profile.id, err);
                            failed++;
                          }
                        }
                        const resultMsg = failed > 0
                          ? `Imported ${imported} items (${failed} failed)`
                          : `Imported ${imported} items successfully`;
                        showToast(resultMsg);
                      } catch (err) {
                        showToast("Error reading file: " + (err?.message || err));
                      }
                    };
                    input.click();
                  }}
                >
                  Import Data (JSON)
                </Button>
              </div>

              <div className="text-xs text-gray-500">
                <strong>Firestore Path:</strong> artifacts/{appId}/contract_entries & case_directory
              </div>
                </div>
              )}
            </div>

            {/* Reports & Analytics */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection("reports")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <LucideIcon name={isSectionExpanded("reports") ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-gray-500" />
                  <LucideIcon name="BarChart3" className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-800">Reports & Analytics</h3>
                </div>
              </button>
              {isSectionExpanded("reports") && (
                <div className="border-t border-gray-200 p-6">

              {(() => {
                // Filter entries for selected month
                const monthEntries = entries.filter((e) => {
                  if (!e.date) return false;
                  const d = new Date(e.date);
                  return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
                });

                // Calculate hours from start_time and end_time
                const calcHours = (entry) => {
                  const start = entry.start_time;
                  const end = entry.end_time;
                  if (!start || !end) return 0;
                  const [sh, sm] = start.split(":").map(Number);
                  const [eh, em] = end.split(":").map(Number);
                  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
                  const startMins = sh * 60 + sm;
                  const endMins = eh * 60 + em;
                  return Math.max(0, (endMins - startMins) / 60);
                };

                // Build per-client stats with gender counts
                const clientStats = {};
                familyDirectoryOptions.forEach((profile) => {
                  const raw = profile.raw || {};

                  // Count children by gender
                  let boys = 0, girls = 0, childrenOther = 0, childrenUnknown = 0;
                  [1, 2, 3, 4, 5, 6, 7].forEach((n) => {
                    const name = String(raw[`Child_${n}`] || "").trim();
                    const gender = String(raw[`Child_${n}_Gender`] || "").trim();
                    if (name) {
                      if (gender === "Male") boys++;
                      else if (gender === "Female") girls++;
                      else if (gender === "Other") childrenOther++;
                      else childrenUnknown++;
                    }
                  });

                  // Count children by gender AND age range
                  let femaleChildren0to5 = 0, femaleChildren6to12 = 0, femaleChildren13to19 = 0;
                  let maleChildren0to5 = 0, maleChildren6to12 = 0, maleChildren13to19 = 0;
                  let hasChildUnder5 = false;
                  [1, 2, 3, 4, 5, 6, 7].forEach((n) => {
                    const name = String(raw[`Child_${n}`] || "").trim();
                    const gender = String(raw[`Child_${n}_Gender`] || "").trim();
                    let ageRange = migrateAgeRange(raw[`Child_${n}_Age_Range`]);
                    if (name) {
                      if (ageRange === "0-5") hasChildUnder5 = true;
                      if (gender === "Female") {
                        if (ageRange === "0-5") femaleChildren0to5++;
                        else if (ageRange === "6-12") femaleChildren6to12++;
                        else if (ageRange === "13-19") femaleChildren13to19++;
                      } else if (gender === "Male") {
                        if (ageRange === "0-5") maleChildren0to5++;
                        else if (ageRange === "6-12") maleChildren6to12++;
                        else if (ageRange === "13-19") maleChildren13to19++;
                      }
                    }
                  });

                  // Count adults by gender
                  let maleAdults = 0, femaleAdults = 0, adultsOther = 0, adultsUnknown = 0;
                  let hasMomOrFemaleParent = false;
                  [1, 2, 3].forEach((n) => {
                    const name = String(raw[`Parent_${n}`] || "").trim();
                    const gender = String(raw[`Parent_${n}_Gender`] || "").trim();
                    const relationship = String(raw[`Parent_${n}_Relationship`] || "").trim();
                    if (name) {
                      if (gender === "Male") maleAdults++;
                      else if (gender === "Female") femaleAdults++;
                      else if (gender === "Other") adultsOther++;
                      else adultsUnknown++;
                      if (relationship === "Mother" || gender === "Female") hasMomOrFemaleParent = true;
                    }
                  });

                  const children = boys + girls + childrenOther + childrenUnknown;
                  const adults = maleAdults + femaleAdults + adultsOther + adultsUnknown;

                  const povertyLevel = String(raw.Poverty_Level || "").trim();
                  const householdType = String(raw.Household_Type || "").trim();
                  const isMomWithChildUnder5 = hasMomOrFemaleParent && hasChildUnder5;

                  clientStats[profile.key] = {
                    caseName: profile.caseName,
                    mcNumber: profile.mcNumber,
                    children,
                    adults,
                    boys,
                    girls,
                    childrenOther,
                    childrenUnknown,
                    maleAdults,
                    femaleAdults,
                    adultsOther,
                    adultsUnknown,
                    povertyLevel,
                    householdType,
                    femaleChildren0to5,
                    femaleChildren6to12,
                    femaleChildren13to19,
                    maleChildren0to5,
                    maleChildren6to12,
                    maleChildren13to19,
                    isMomWithChildUnder5,
                    completedContacts: 0,
                    cancelledVisits: 0,
                    cancelledByParent: 0,
                    cancelledByWorker: 0,
                    totalHours: 0,
                    byService: {},
                    // Units tracking
                    authorizedUnits: parseFloat(raw.Authorized_Units) || 0,
                    unitsPeriod: String(raw.Units_Period || "Total"),
                    unitsUsedHours: 0,
                    unitsUsedTests: 0,
                  };
                });

                // Process entries
                monthEntries.forEach((entry) => {
                  // Find matching client
                  const clientKey = normalize(entry.family_directory_key) ||
                    normalize(entry.family_id) ||
                    familyDirectoryOptions.find((o) =>
                      normalize(o.mcNumber) === normalize(entry.master_case) ||
                      normalizeLower(o.caseName) === normalizeLower(entry.family_name)
                    )?.key;

                  if (!clientKey || !clientStats[clientKey]) return;

                  const stat = clientStats[clientKey];
                  const serviceType = entry.service_type || "Other";
                  const contactType = entry.contact_type || "";
                  const isCancelledByParent = contactType === "Cancelled by Parent";
                  const isCancelledByWorker = contactType === "Cancelled by Worker";
                  const isCancelled = isCancelledByParent || isCancelledByWorker || ["Cancelled for Weather", "Cancelled by Team", "Cancelled No Confirmation", "Cancelled In Route"].includes(contactType);
                  const isRemote = ["Phone Call", "Text Message"].includes(contactType);

                  if (!stat.byService[serviceType]) {
                    stat.byService[serviceType] = { completed: 0, cancelled: 0, hours: 0 };
                  }

                  if (isCancelled) {
                    stat.cancelledVisits++;
                    stat.byService[serviceType].cancelled++;
                    if (isCancelledByParent) stat.cancelledByParent++;
                    if (isCancelledByWorker) stat.cancelledByWorker++;
                  } else if (!isRemote) {
                    // Completed contact (not phone/text)
                    stat.completedContacts++;
                    stat.byService[serviceType].completed++;
                    const hours = calcHours(entry);
                    stat.totalHours += hours;
                    stat.byService[serviceType].hours += hours;

                    // Track units used from stored data or calculate
                    if (entry.units_used !== undefined) {
                      if (entry.units_type === "occurrence") {
                        stat.unitsUsedTests += entry.units_used;
                      } else {
                        stat.unitsUsedHours += entry.units_used;
                      }
                    } else {
                      // Fallback: calculate from service type
                      if (serviceType.startsWith("DST")) {
                        stat.unitsUsedTests += 1;
                      } else {
                        stat.unitsUsedHours += hours;
                      }
                    }
                  }
                });

                // Filter by family if selected
                const filteredStats = reportFamilyFilter
                  ? { [reportFamilyFilter]: clientStats[reportFamilyFilter] }
                  : clientStats;
                const statsArray = Object.entries(filteredStats).filter(([_, s]) => s);

                // Summary totals (based on filter)
                const totalClients = statsArray.length;
                const totalChildren = statsArray.reduce((sum, [_, s]) => sum + s.children, 0);
                const totalAdults = statsArray.reduce((sum, [_, s]) => sum + s.adults, 0);
                const totalBoys = statsArray.reduce((sum, [_, s]) => sum + s.boys, 0);
                const totalGirls = statsArray.reduce((sum, [_, s]) => sum + s.girls, 0);
                const totalMaleAdults = statsArray.reduce((sum, [_, s]) => sum + s.maleAdults, 0);
                const totalFemaleAdults = statsArray.reduce((sum, [_, s]) => sum + s.femaleAdults, 0);

                // Poverty level counts
                const belowPoverty = statsArray.filter(([_, s]) => s.povertyLevel === "Below Poverty Level").length;
                const atPoverty = statsArray.filter(([_, s]) => s.povertyLevel === "At Poverty Level").length;
                const abovePoverty = statsArray.filter(([_, s]) => s.povertyLevel === "Above Poverty Level").length;

                // Cancellation breakdown
                const totalCancelledByParent = statsArray.reduce((sum, [_, s]) => sum + s.cancelledByParent, 0);
                const totalCancelledByWorker = statsArray.reduce((sum, [_, s]) => sum + s.cancelledByWorker, 0);
                const totalCompleted = statsArray.reduce((sum, [_, s]) => sum + s.completedContacts, 0);
                const totalCancelled = statsArray.reduce((sum, [_, s]) => sum + s.cancelledVisits, 0);
                const totalHours = statsArray.reduce((sum, [_, s]) => sum + s.totalHours, 0);

                // Units tracking totals
                const totalUnitsUsedHours = statsArray.reduce((sum, [_, s]) => sum + s.unitsUsedHours, 0);
                const totalUnitsUsedTests = statsArray.reduce((sum, [_, s]) => sum + s.unitsUsedTests, 0);
                const totalAuthorizedUnits = statsArray.reduce((sum, [_, s]) => sum + s.authorizedUnits, 0);
                const familiesWithUnits = statsArray.filter(([_, s]) => s.authorizedUnits > 0);
                const familiesOverBudget = familiesWithUnits.filter(([_, s]) => {
                  const totalUsed = s.unitsUsedHours + s.unitsUsedTests;
                  return totalUsed > s.authorizedUnits;
                });

                // Demographic breakdown totals
                const totalFemaleChildren0to5 = statsArray.reduce((sum, [_, s]) => sum + s.femaleChildren0to5, 0);
                const totalFemaleChildren6to12 = statsArray.reduce((sum, [_, s]) => sum + s.femaleChildren6to12, 0);
                const totalFemaleChildren13to19 = statsArray.reduce((sum, [_, s]) => sum + s.femaleChildren13to19, 0);
                const totalMaleChildren0to5 = statsArray.reduce((sum, [_, s]) => sum + s.maleChildren0to5, 0);
                const totalMaleChildren6to12 = statsArray.reduce((sum, [_, s]) => sum + s.maleChildren6to12, 0);
                const totalMaleChildren13to19 = statsArray.reduce((sum, [_, s]) => sum + s.maleChildren13to19, 0);
                const totalMomsWithChildrenUnder5 = statsArray.filter(([_, s]) => s.isMomWithChildUnder5).length;
                const totalWomen19Plus = totalFemaleAdults;
                const totalSingleMotherHoH = statsArray.filter(([_, s]) => s.householdType === "Single Mother").length;
                const totalSingleFatherHoH = statsArray.filter(([_, s]) => s.householdType === "Single Father").length;
                const childrenBelowPoverty = statsArray
                  .filter(([_, s]) => s.povertyLevel === "Below Poverty Level")
                  .reduce((sum, [_, s]) => sum + s.children, 0);
                const adultsBelowPoverty = statsArray
                  .filter(([_, s]) => s.povertyLevel === "Below Poverty Level")
                  .reduce((sum, [_, s]) => sum + s.adults, 0);

                const monthNames = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];

                return (
                  <div>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
                        <select
                          value={reportMonth}
                          onChange={(e) => setReportMonth(Number(e.target.value))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {monthNames.map((name, idx) => (
                            <option key={idx} value={idx}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                        <select
                          value={reportYear}
                          onChange={(e) => setReportYear(Number(e.target.value))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {[2023, 2024, 2025, 2026].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Family Filter</label>
                        <select
                          value={reportFamilyFilter}
                          onChange={(e) => setReportFamilyFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">All Families</option>
                          {familyDirectoryOptions.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.mcNumber ? `${o.caseName} (${o.mcNumber})` : o.caseName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Summary Cards - Demographics */}
                    <div className="mb-4">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Demographics</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-3">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-blue-700">{totalClients}</div>
                          <div className="text-xs text-blue-600">Families</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-cyan-700">{totalBoys}</div>
                          <div className="text-xs text-cyan-600">Boys</div>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-pink-700">{totalGirls}</div>
                          <div className="text-xs text-pink-600">Girls</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-green-700">{totalChildren}</div>
                          <div className="text-xs text-green-600">Total Children</div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-indigo-700">{totalMaleAdults}</div>
                          <div className="text-xs text-indigo-600">Male Adults</div>
                        </div>
                        <div className="bg-fuchsia-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-fuchsia-700">{totalFemaleAdults}</div>
                          <div className="text-xs text-fuchsia-600">Female Adults</div>
                        </div>
                      </div>
                      {/* Children by Age & Gender */}
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-3">Children by Age & Gender</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                        <div className="bg-pink-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-pink-700">{totalFemaleChildren0to5}</div>
                          <div className="text-xs text-pink-600">Girls 0-5</div>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-pink-700">{totalFemaleChildren6to12}</div>
                          <div className="text-xs text-pink-600">Girls 6-12</div>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-pink-700">{totalFemaleChildren13to19}</div>
                          <div className="text-xs text-pink-600">Girls 13-19</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-cyan-700">{totalMaleChildren0to5}</div>
                          <div className="text-xs text-cyan-600">Boys 0-5</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-cyan-700">{totalMaleChildren6to12}</div>
                          <div className="text-xs text-cyan-600">Boys 6-12</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-2 text-center">
                          <div className="text-xl font-bold text-cyan-700">{totalMaleChildren13to19}</div>
                          <div className="text-xs text-cyan-600">Boys 13-19</div>
                        </div>
                      </div>
                      {/* Household & Adults */}
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Household & Adults</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-200">
                          <div className="text-xl font-bold text-purple-700">{totalMomsWithChildrenUnder5}</div>
                          <div className="text-xs text-purple-600">Moms w/ Children Under 5</div>
                        </div>
                        <div className="bg-fuchsia-50 rounded-lg p-2 text-center border border-fuchsia-200">
                          <div className="text-xl font-bold text-fuchsia-700">{totalWomen19Plus}</div>
                          <div className="text-xs text-fuchsia-600">Women 19+</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
                          <div className="text-xl font-bold text-orange-700">{totalSingleMotherHoH}</div>
                          <div className="text-xs text-orange-600">Single Mother HoH</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200">
                          <div className="text-xl font-bold text-amber-700">{totalSingleFatherHoH}</div>
                          <div className="text-xs text-amber-600">Single Father HoH</div>
                        </div>
                      </div>
                      {/* Poverty Level Stats */}
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Poverty Level</div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
                          <div className="text-xl font-bold text-red-700">{belowPoverty}</div>
                          <div className="text-xs text-red-600">Families Below Poverty</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2 text-center border border-yellow-200">
                          <div className="text-xl font-bold text-yellow-700">{atPoverty}</div>
                          <div className="text-xs text-yellow-600">At Poverty</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                          <div className="text-xl font-bold text-green-700">{abovePoverty}</div>
                          <div className="text-xs text-green-600">Above Poverty</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
                          <div className="text-xl font-bold text-red-700">{childrenBelowPoverty}</div>
                          <div className="text-xs text-red-600">Children Below Poverty</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
                          <div className="text-xl font-bold text-red-700">{adultsBelowPoverty}</div>
                          <div className="text-xs text-red-600">Adults Below Poverty</div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards - Activity with KPIs */}
                    <div className="mb-6">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Activity & KPIs ({monthNames[reportMonth]} {reportYear})</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-3">
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-emerald-700">{totalCompleted}</div>
                          <div className="text-xs text-emerald-600 font-medium">Completed Visits</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-red-700">{totalCancelled}</div>
                          <div className="text-xs text-red-600 font-medium">Total Cancelled</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-orange-700">{totalCancelledByParent}</div>
                          <div className="text-xs text-orange-600 font-medium">By Parent</div>
                        </div>
                        <div className="bg-violet-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-violet-700">{totalCancelledByWorker}</div>
                          <div className="text-xs text-violet-600 font-medium">By Worker</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-amber-700">{totalHours.toFixed(1)}</div>
                          <div className="text-xs text-amber-600 font-medium">Hours Used</div>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-slate-700">
                            {totalCompleted + totalCancelled > 0 ? ((totalCompleted / (totalCompleted + totalCancelled)) * 100).toFixed(0) : 0}%
                          </div>
                          <div className="text-xs text-slate-600 font-medium">Completion Rate</div>
                        </div>
                      </div>
                      {/* KPI Progress Bar */}
                      {totalCompleted + totalCancelled > 0 && (
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-600">Visit Completion Rate</span>
                            <span className="font-bold text-gray-700">{totalCompleted} of {totalCompleted + totalCancelled} visits completed</span>
                          </div>
                          <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-4 rounded-full transition-all duration-500"
                              style={{ width: `${(totalCompleted / (totalCompleted + totalCancelled)) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs mt-1 text-gray-500">
                            <span>Cancelled: {totalCancelled} ({totalCancelled > 0 ? ((totalCancelled / (totalCompleted + totalCancelled)) * 100).toFixed(0) : 0}%)</span>
                            <span>Completed: {totalCompleted} ({totalCompleted > 0 ? ((totalCompleted / (totalCompleted + totalCancelled)) * 100).toFixed(0) : 0}%)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Units Tracking Section */}
                    <div className="mb-6">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Units Tracking ({monthNames[reportMonth]} {reportYear})</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
                        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                          <div className="text-2xl font-bold text-blue-700">{totalUnitsUsedHours.toFixed(1)}</div>
                          <div className="text-xs text-blue-600 font-medium">Hours Used</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                          <div className="text-2xl font-bold text-purple-700">{totalUnitsUsedTests}</div>
                          <div className="text-xs text-purple-600 font-medium">Drug Tests</div>
                        </div>
                        <div className="bg-teal-50 rounded-lg p-3 text-center border border-teal-200">
                          <div className="text-2xl font-bold text-teal-700">{totalAuthorizedUnits.toFixed(0)}</div>
                          <div className="text-xs text-teal-600 font-medium">Total Authorized</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-3 text-center border border-cyan-200">
                          <div className="text-2xl font-bold text-cyan-700">{familiesWithUnits.length}</div>
                          <div className="text-xs text-cyan-600 font-medium">Families w/ Units</div>
                        </div>
                        <div className={`rounded-lg p-3 text-center border ${familiesOverBudget.length > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                          <div className={`text-2xl font-bold ${familiesOverBudget.length > 0 ? "text-red-700" : "text-green-700"}`}>{familiesOverBudget.length}</div>
                          <div className={`text-xs font-medium ${familiesOverBudget.length > 0 ? "text-red-600" : "text-green-600"}`}>Over Budget</div>
                        </div>
                      </div>

                      {/* Per-Family Units Table */}
                      {familiesWithUnits.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-semibold text-gray-600 mb-2">Family Units Breakdown</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left px-2 py-1 font-semibold">Family</th>
                                  <th className="text-center px-2 py-1 font-semibold">Authorized</th>
                                  <th className="text-center px-2 py-1 font-semibold">Period</th>
                                  <th className="text-center px-2 py-1 font-semibold">Hours Used</th>
                                  <th className="text-center px-2 py-1 font-semibold">Tests</th>
                                  <th className="text-center px-2 py-1 font-semibold">Total Used</th>
                                  <th className="text-center px-2 py-1 font-semibold">Remaining</th>
                                </tr>
                              </thead>
                              <tbody>
                                {familiesWithUnits.map(([key, stat]) => {
                                  const totalUsed = stat.unitsUsedHours + stat.unitsUsedTests;
                                  const remaining = stat.authorizedUnits - totalUsed;
                                  const isOver = remaining < 0;
                                  return (
                                    <tr key={key} className="border-b border-gray-100 hover:bg-gray-100">
                                      <td className="px-2 py-1 font-medium">{stat.caseName}</td>
                                      <td className="px-2 py-1 text-center">{stat.authorizedUnits}</td>
                                      <td className="px-2 py-1 text-center text-gray-500">{stat.unitsPeriod}</td>
                                      <td className="px-2 py-1 text-center">{stat.unitsUsedHours.toFixed(1)}</td>
                                      <td className="px-2 py-1 text-center">{stat.unitsUsedTests}</td>
                                      <td className="px-2 py-1 text-center font-medium">{totalUsed.toFixed(1)}</td>
                                      <td className={`px-2 py-1 text-center font-bold ${isOver ? "text-red-600" : "text-green-600"}`}>
                                        {isOver ? remaining.toFixed(1) : `+${remaining.toFixed(1)}`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Per-Client Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 text-left">
                            <th className="px-3 py-2 font-semibold text-gray-700">Client</th>
                            <th className="px-3 py-2 font-semibold text-gray-700 text-center">Boys</th>
                            <th className="px-3 py-2 font-semibold text-gray-700 text-center">Girls</th>
                            <th className="px-3 py-2 font-semibold text-gray-700 text-center">M Adults</th>
                            <th className="px-3 py-2 font-semibold text-gray-700 text-center">F Adults</th>
                            <th className="px-3 py-2 font-semibold text-gray-700 text-center">Completed</th>
                            <th className="px-3 py-2 font-semibold text-gray-700 text-center">Cancelled</th>
                            <th className="px-3 py-2 font-semibold text-gray-700 text-center">Hours</th>
                            <th className="px-3 py-2 font-semibold text-gray-700">Services</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsArray
                            .filter(([_, s]) => s.completedContacts > 0 || s.cancelledVisits > 0 || reportFamilyFilter)
                            .sort((a, b) => a[1].caseName.localeCompare(b[1].caseName))
                            .map(([key, stat]) => (
                              <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <div className="font-medium text-gray-800">{stat.caseName}</div>
                                  {stat.mcNumber && <div className="text-xs text-gray-500">MC: {stat.mcNumber}</div>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="text-cyan-700">{stat.boys}</span>
                                  {stat.childrenUnknown > 0 && <span className="text-gray-400 text-xs ml-1">(+{stat.childrenUnknown}?)</span>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="text-pink-700">{stat.girls}</span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="text-indigo-700">{stat.maleAdults}</span>
                                  {stat.adultsUnknown > 0 && <span className="text-gray-400 text-xs ml-1">(+{stat.adultsUnknown}?)</span>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="text-fuchsia-700">{stat.femaleAdults}</span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {stat.completedContacts}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {stat.cancelledVisits > 0 ? (
                                    <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                      {stat.cancelledVisits}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">0</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center font-medium">{stat.totalHours.toFixed(1)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(stat.byService).map(([svc, data]) => (
                                      <span key={svc} className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                                        {svc}: {data.completed}v / {data.hours.toFixed(1)}h
                                        {data.cancelled > 0 && <span className="text-red-600 ml-1">({data.cancelled} canc)</span>}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {statsArray.length === 0 || (statsArray.every(([_, s]) => s.completedContacts === 0 && s.cancelledVisits === 0) && !reportFamilyFilter) ? (
                            <tr>
                              <td colSpan={9} className="px-3 py-8 text-center text-gray-400 italic">
                                No entries found for {monthNames[reportMonth]} {reportYear}
                                {reportFamilyFilter && " for selected family"}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    {/* Export Report Buttons */}
                    <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
                      <Button
                        variant="secondary"
                        iconName="Download"
                        onClick={() => {
                          const rows = [
                            ["Client", "MC Number", "Boys", "Girls", "Total Children", "Male Adults", "Female Adults", "Total Adults", "Poverty Level", "Household Type", "Girls 0-5", "Girls 6-12", "Girls 13-19", "Boys 0-5", "Boys 6-12", "Boys 13-19", "Completed Visits", "Cancelled by Parent", "Cancelled by Worker", "Total Cancelled", "Hours Used", "Authorized Units", "Units Period", "Units Used (Hrs)", "Units Used (Tests)", "Units Remaining", "Month", "Year"].join(","),
                            ...statsArray
                              .filter(([_, s]) => s.completedContacts > 0 || s.cancelledVisits > 0 || s.children > 0 || reportFamilyFilter)
                              .map(([_, s]) => {
                                const totalUsed = s.unitsUsedHours + s.unitsUsedTests;
                                const remaining = s.authorizedUnits - totalUsed;
                                return [
                                  `"${s.caseName || ""}"`,
                                  `"${s.mcNumber || ""}"`,
                                  s.boys,
                                  s.girls,
                                  s.children,
                                  s.maleAdults,
                                  s.femaleAdults,
                                  s.adults,
                                  `"${s.povertyLevel || ""}"`,
                                  `"${s.householdType || ""}"`,
                                  s.femaleChildren0to5,
                                  s.femaleChildren6to12,
                                  s.femaleChildren13to19,
                                  s.maleChildren0to5,
                                  s.maleChildren6to12,
                                  s.maleChildren13to19,
                                  s.completedContacts,
                                  s.cancelledByParent,
                                  s.cancelledByWorker,
                                  s.cancelledVisits,
                                  s.totalHours.toFixed(2),
                                  s.authorizedUnits,
                                  `"${s.unitsPeriod || ""}"`,
                                  s.unitsUsedHours.toFixed(2),
                                  s.unitsUsedTests,
                                  remaining.toFixed(2),
                                  monthNames[reportMonth],
                                  reportYear,
                                ].join(",");
                              })
                          ];
                          const csv = rows.join("\n");
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `report-${monthNames[reportMonth]}-${reportYear}${reportFamilyFilter ? "-filtered" : ""}.csv`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showToast("Report exported");
                        }}
                      >
                        Export Report (CSV)
                      </Button>

                      {/* AI Reports Dropdown */}
                      <div className="flex items-end gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">AI Report Type</label>
                          <select
                            value={aiReportType}
                            onChange={(e) => setAiReportType(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[200px]"
                          >
                            <option value="monthly-summary">Monthly Executive Summary</option>
                            <option value="units-analysis">Units Usage Analysis</option>
                            <option value="family-progress">Family Progress Report</option>
                            <option value="goal-achievement">Goal Achievement Analysis</option>
                            <option value="cancellation-analysis">Cancellation Analysis</option>
                            <option value="service-breakdown">Service Type Breakdown</option>
                            <option value="demographic-insights">Demographic Insights</option>
                            <option value="trend-analysis">Trend Analysis (3 months)</option>
                          </select>
                        </div>
                        <Button
                          variant="primary"
                          iconName="FileText"
                          disabled={aiReportLoading}
                          onClick={async () => {
                            setAiReportLoading(true);
                            showToast("Generating AI report...");

                            // Build comprehensive data for AI
                            const reportData = {
                              month: monthNames[reportMonth],
                              year: reportYear,
                              totalFamilies: totalClients,
                              demographics: {
                                boys: totalBoys,
                                girls: totalGirls,
                                totalChildren: totalChildren,
                                maleAdults: totalMaleAdults,
                                femaleAdults: totalFemaleAdults,
                                totalAdults: totalAdults,
                                totalPeople: totalChildren + totalAdults,
                                femaleChildren0to5: totalFemaleChildren0to5,
                                femaleChildren6to12: totalFemaleChildren6to12,
                                femaleChildren13to19: totalFemaleChildren13to19,
                                maleChildren0to5: totalMaleChildren0to5,
                                maleChildren6to12: totalMaleChildren6to12,
                                maleChildren13to19: totalMaleChildren13to19,
                                momsWithChildrenUnder5: totalMomsWithChildrenUnder5,
                                women19Plus: totalWomen19Plus,
                                singleMotherHoH: totalSingleMotherHoH,
                                singleFatherHoH: totalSingleFatherHoH,
                              },
                              povertyLevels: {
                                belowPoverty,
                                atPoverty,
                                abovePoverty,
                                childrenBelowPoverty,
                                adultsBelowPoverty,
                              },
                              activity: {
                                completedVisits: totalCompleted,
                                totalCancelled,
                                cancelledByParent: totalCancelledByParent,
                                cancelledByWorker: totalCancelledByWorker,
                                totalHours: totalHours.toFixed(1),
                                completionRate: totalCompleted + totalCancelled > 0 ? ((totalCompleted / (totalCompleted + totalCancelled)) * 100).toFixed(1) : "N/A",
                              },
                              unitsTracking: {
                                totalHoursUsed: totalUnitsUsedHours.toFixed(1),
                                totalTestsUsed: totalUnitsUsedTests,
                                totalAuthorized: totalAuthorizedUnits,
                                familiesWithUnits: familiesWithUnits.length,
                                familiesOverBudget: familiesOverBudget.length,
                                familyDetails: familiesWithUnits.map(([_, s]) => ({
                                  name: s.caseName,
                                  authorized: s.authorizedUnits,
                                  period: s.unitsPeriod,
                                  hoursUsed: s.unitsUsedHours.toFixed(1),
                                  testsUsed: s.unitsUsedTests,
                                  remaining: (s.authorizedUnits - s.unitsUsedHours - s.unitsUsedTests).toFixed(1),
                                })),
                              },
                              perFamilyStats: statsArray.slice(0, 20).map(([_, s]) => ({
                                name: s.caseName,
                                completed: s.completedContacts,
                                cancelled: s.cancelledVisits,
                                hours: s.totalHours.toFixed(1),
                                services: Object.keys(s.byService),
                              })),
                            };

                            // Build prompt based on report type
                            const reportPrompts = {
                              "monthly-summary": `Generate a professional monthly executive summary for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nWrite a 2-3 paragraph executive summary that:\n1. Summarizes key demographics served (families, children by gender, adults)\n2. Highlights poverty level distribution\n3. Reports on service delivery (completed visits, hours, completion rate)\n4. Notes units usage and any concerning trends\n\nKeep it professional and suitable for stakeholder reporting. Use specific numbers.`,

                              "units-analysis": `Generate a detailed Units Usage Analysis report for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nFocus on:\n1. Overall units consumption vs authorized amounts\n2. Which families are approaching or over their budget\n3. Hours vs drug test units breakdown\n4. Recommendations for units allocation\n5. Families that may need authorization adjustments\n\nProvide actionable insights for managing service units.`,

                              "family-progress": `Generate a Family Progress Report for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nAnalyze:\n1. Service engagement levels per family\n2. Consistency of visits (completed vs cancelled)\n3. Hours of service received\n4. Which families are most/least engaged\n5. Recommendations for improving engagement\n\nMake it suitable for case management review.`,

                              "goal-achievement": `Generate a Goal Achievement Analysis for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nNote: This report focuses on service delivery metrics as proxy for goal achievement.\n\nAnalyze:\n1. Service completion rates as indicator of family engagement\n2. Hours invested per family\n3. Service types utilized\n4. Patterns that may indicate progress or challenges\n5. Recommendations for goal-focused interventions\n\nProvide insights for case planning.`,

                              "cancellation-analysis": `Generate a Cancellation Analysis report for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nFocus on:\n1. Overall cancellation rate and trends\n2. Cancellations by parent vs worker\n3. Impact on service delivery\n4. Families with high cancellation rates\n5. Strategies to reduce cancellations\n6. Financial/resource impact of cancellations\n\nProvide actionable recommendations.`,

                              "service-breakdown": `Generate a Service Type Breakdown report for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nAnalyze:\n1. Distribution of service types (OHFS, IHFS, PTSV, DST, etc.)\n2. Hours per service type\n3. Completion rates by service type\n4. Staffing implications\n5. Service type trends and recommendations\n\nProvide insights for service planning.`,

                              "demographic-insights": `Generate a Demographic Insights report for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nAnalyze:\n1. Gender distribution of children served\n2. Family composition patterns\n3. Poverty level distribution and implications\n4. Demographics vs service utilization patterns\n5. Equity considerations in service delivery\n6. Recommendations for demographic-responsive services\n\nMake it suitable for grant reporting.`,

                              "trend-analysis": `Generate a Trend Analysis report for Epworth Family Resources based on this data:\n\n${JSON.stringify(reportData, null, 2)}\n\nNote: This analysis is based on the current month's data. For actual trend analysis, compare with previous months.\n\nProvide:\n1. Key metrics summary for this period\n2. Areas showing potential positive trends\n3. Areas of concern that may be trending negatively\n4. Seasonal or cyclical patterns to watch\n5. Predictive insights based on current data\n6. Recommendations for the next quarter\n\nMake it strategic and forward-looking.`,
                            };

                            const prompt = reportPrompts[aiReportType] || reportPrompts["monthly-summary"];
                            const reportTitles = {
                              "monthly-summary": "Monthly Executive Summary",
                              "units-analysis": "Units Usage Analysis",
                              "family-progress": "Family Progress Report",
                              "goal-achievement": "Goal Achievement Analysis",
                              "cancellation-analysis": "Cancellation Analysis",
                              "service-breakdown": "Service Type Breakdown",
                              "demographic-insights": "Demographic Insights",
                              "trend-analysis": "Trend Analysis",
                            };

                            try {
                              const response = await authFetch("/api/generateReport", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ prompt }),
                              });

                              const result = await response.json().catch(() => ({}));
                              if (!response.ok || result?.error) {
                                throw new Error(result?.error || `API error: ${response.status}`);
                              }
                              const reportText = result?.text || "Unable to generate report. Please try again.";

                              // Build KPI cards HTML from current data — all dashboard sections
                              const completionRate = totalCompleted + totalCancelled > 0 ? ((totalCompleted / (totalCompleted + totalCancelled)) * 100).toFixed(0) : 0;
                              const kpiCardsHtml = `
                                <div class="data-section-label">DEMOGRAPHICS</div>
                                <div class="kpi-grid">
                                  <div class="kpi-card blue">
                                    <div class="kpi-value">${totalClients}</div>
                                    <div class="kpi-label">Families</div>
                                  </div>
                                  <div class="kpi-card blue">
                                    <div class="kpi-value">${totalBoys}</div>
                                    <div class="kpi-label">Boys</div>
                                  </div>
                                  <div class="kpi-card blue">
                                    <div class="kpi-value">${totalGirls}</div>
                                    <div class="kpi-label">Girls</div>
                                  </div>
                                  <div class="kpi-card blue">
                                    <div class="kpi-value">${totalChildren}</div>
                                    <div class="kpi-label">Total Children</div>
                                  </div>
                                  <div class="kpi-card blue">
                                    <div class="kpi-value">${totalMaleAdults}</div>
                                    <div class="kpi-label">Male Adults</div>
                                  </div>
                                  <div class="kpi-card blue">
                                    <div class="kpi-value">${totalFemaleAdults}</div>
                                    <div class="kpi-label">Female Adults</div>
                                  </div>
                                </div>

                                <div class="data-section-label">CHILDREN BY AGE & GENDER</div>
                                <div class="kpi-grid">
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalFemaleChildren0to5}</span>
                                    <span class="kpi-sm-label">Girls 0-5</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalFemaleChildren6to12}</span>
                                    <span class="kpi-sm-label">Girls 6-12</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalFemaleChildren13to19}</span>
                                    <span class="kpi-sm-label">Girls 13-19</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalMaleChildren0to5}</span>
                                    <span class="kpi-sm-label">Boys 0-5</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalMaleChildren6to12}</span>
                                    <span class="kpi-sm-label">Boys 6-12</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalMaleChildren13to19}</span>
                                    <span class="kpi-sm-label">Boys 13-19</span>
                                  </div>
                                </div>

                                <div class="data-section-label">HOUSEHOLD & ADULTS</div>
                                <div class="kpi-grid small-4">
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalMomsWithChildrenUnder5}</span>
                                    <span class="kpi-sm-label">Moms w/ Children Under 5</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalWomen19Plus}</span>
                                    <span class="kpi-sm-label">Women 19+</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalSingleMotherHoH}</span>
                                    <span class="kpi-sm-label">Single Mother HoH</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalSingleFatherHoH}</span>
                                    <span class="kpi-sm-label">Single Father HoH</span>
                                  </div>
                                </div>

                                <div class="data-section-label">POVERTY LEVEL</div>
                                <div class="kpi-grid small-5">
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${belowPoverty}</span>
                                    <span class="kpi-sm-label">Families Below Poverty</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${atPoverty}</span>
                                    <span class="kpi-sm-label">At Poverty</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${abovePoverty}</span>
                                    <span class="kpi-sm-label">Above Poverty</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${childrenBelowPoverty}</span>
                                    <span class="kpi-sm-label">Children Below Poverty</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${adultsBelowPoverty}</span>
                                    <span class="kpi-sm-label">Adults Below Poverty</span>
                                  </div>
                                </div>

                                <div class="data-section-label">ACTIVITY & KPIs (${monthNames[reportMonth].toUpperCase()} ${reportYear})</div>
                                <div class="kpi-grid">
                                  <div class="kpi-card green">
                                    <div class="kpi-value">${totalCompleted}</div>
                                    <div class="kpi-label">Completed Visits</div>
                                  </div>
                                  <div class="kpi-card red">
                                    <div class="kpi-value">${totalCancelled}</div>
                                    <div class="kpi-label">Total Cancelled</div>
                                  </div>
                                  <div class="kpi-card amber">
                                    <div class="kpi-value">${totalCancelledByParent}</div>
                                    <div class="kpi-label">By Parent</div>
                                  </div>
                                  <div class="kpi-card amber">
                                    <div class="kpi-value">${totalCancelledByWorker}</div>
                                    <div class="kpi-label">By Worker</div>
                                  </div>
                                  <div class="kpi-card teal">
                                    <div class="kpi-value">${totalHours.toFixed(1)}</div>
                                    <div class="kpi-label">Hours Used</div>
                                  </div>
                                  <div class="kpi-card purple">
                                    <div class="kpi-value">${completionRate}%</div>
                                    <div class="kpi-label">Completion Rate</div>
                                  </div>
                                </div>

                                <div class="data-section-label">UNITS TRACKING</div>
                                <div class="kpi-grid small-4">
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalUnitsUsedHours.toFixed(1)}</span>
                                    <span class="kpi-sm-label">Hours Used</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalUnitsUsedTests}</span>
                                    <span class="kpi-sm-label">Drug Tests</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${totalAuthorizedUnits}</span>
                                    <span class="kpi-sm-label">Total Authorized</span>
                                  </div>
                                  <div class="kpi-card-sm">
                                    <span class="kpi-sm-value">${familiesOverBudget.length}</span>
                                    <span class="kpi-sm-label">Over Budget</span>
                                  </div>
                                </div>
                              `;

                              // Show report in a professional KPI format
                              const analyticsFileName = buildReportFileName({
                                familyName: "",
                                mcNumber: "",
                                serviceTypes: "",
                                month: monthNames[reportMonth],
                                year: String(reportYear),
                                reportType: reportTitles[aiReportType],
                              });
                              const reportWindow = window.open("", "_blank", "width=850,height=700");
                              reportWindow.document.write(`
                                <html>
                                <head>
                                  <title>${analyticsFileName}</title>
                                  <style>
                                    @page { size: letter; margin: 0.5in; }
                                    * { box-sizing: border-box; }
                                    body {
                                      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                                      padding: 0;
                                      margin: 0;
                                      color: #1a1a1a;
                                      background: #f8fafc;
                                    }
                                    .report-container {
                                      max-width: 800px;
                                      margin: 0 auto;
                                      background: white;
                                      min-height: 100vh;
                                    }
                                    .header {
                                      background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%);
                                      color: white;
                                      padding: 24px 32px;
                                      display: flex;
                                      justify-content: space-between;
                                      align-items: center;
                                    }
                                    .header-left h1 {
                                      margin: 0;
                                      font-size: 22px;
                                      font-weight: 700;
                                      letter-spacing: -0.5px;
                                    }
                                    .header-left .subtitle {
                                      margin: 4px 0 0;
                                      font-size: 13px;
                                      opacity: 0.85;
                                      font-weight: 400;
                                    }
                                    .header-right {
                                      text-align: right;
                                    }
                                    .header-right .org {
                                      font-size: 14px;
                                      font-weight: 600;
                                      opacity: 0.95;
                                    }
                                    .header-right .date {
                                      font-size: 12px;
                                      opacity: 0.75;
                                      margin-top: 2px;
                                    }
                                    .content-area {
                                      padding: 24px 32px;
                                    }
                                    .kpi-grid {
                                      display: grid;
                                      grid-template-columns: repeat(3, 1fr);
                                      gap: 12px;
                                      margin-bottom: 16px;
                                    }
                                    .kpi-grid.small {
                                      grid-template-columns: repeat(6, 1fr);
                                      gap: 8px;
                                    }
                                    .kpi-grid.small-4 {
                                      grid-template-columns: repeat(4, 1fr);
                                      gap: 8px;
                                    }
                                    .kpi-grid.small-5 {
                                      grid-template-columns: repeat(5, 1fr);
                                      gap: 8px;
                                    }
                                    .data-section-label {
                                      font-size: 10px;
                                      font-weight: 700;
                                      color: #64748b;
                                      text-transform: uppercase;
                                      letter-spacing: 1px;
                                      margin: 16px 0 6px;
                                    }
                                    .data-section-label:first-child {
                                      margin-top: 0;
                                    }
                                    .kpi-card {
                                      padding: 16px;
                                      border-radius: 10px;
                                      text-align: center;
                                      border: 1px solid #e2e8f0;
                                    }
                                    .kpi-card.blue { background: #eff6ff; border-color: #bfdbfe; }
                                    .kpi-card.green { background: #ecfdf5; border-color: #a7f3d0; }
                                    .kpi-card.amber { background: #fffbeb; border-color: #fde68a; }
                                    .kpi-card.purple { background: #f5f3ff; border-color: #ddd6fe; }
                                    .kpi-card.teal { background: #f0fdfa; border-color: #99f6e4; }
                                    .kpi-card.red { background: #fef2f2; border-color: #fecaca; }
                                    .kpi-value {
                                      font-size: 28px;
                                      font-weight: 800;
                                      color: #1e3a5f;
                                      line-height: 1;
                                    }
                                    .kpi-label {
                                      font-size: 11px;
                                      font-weight: 600;
                                      color: #64748b;
                                      text-transform: uppercase;
                                      letter-spacing: 0.5px;
                                      margin-top: 6px;
                                    }
                                    .kpi-card-sm {
                                      background: #f8fafc;
                                      border: 1px solid #e2e8f0;
                                      border-radius: 6px;
                                      padding: 8px;
                                      text-align: center;
                                    }
                                    .kpi-sm-value {
                                      font-size: 16px;
                                      font-weight: 700;
                                      color: #1e3a5f;
                                      display: block;
                                    }
                                    .kpi-sm-label {
                                      font-size: 9px;
                                      color: #64748b;
                                      text-transform: uppercase;
                                      letter-spacing: 0.3px;
                                      display: block;
                                      margin-top: 2px;
                                    }
                                    .section-title {
                                      font-size: 13px;
                                      font-weight: 700;
                                      color: #1e3a5f;
                                      text-transform: uppercase;
                                      letter-spacing: 0.5px;
                                      margin: 24px 0 12px;
                                      padding-bottom: 8px;
                                      border-bottom: 2px solid #e2e8f0;
                                    }
                                    .report-content {
                                      font-size: 13px;
                                      line-height: 1.7;
                                      color: #374151;
                                      white-space: pre-wrap;
                                    }
                                    .footer {
                                      margin-top: 32px;
                                      padding-top: 16px;
                                      border-top: 1px solid #e2e8f0;
                                      display: flex;
                                      justify-content: space-between;
                                      align-items: center;
                                      font-size: 10px;
                                      color: #9ca3af;
                                    }
                                    .actions {
                                      padding: 16px 32px;
                                      background: #f8fafc;
                                      border-top: 1px solid #e2e8f0;
                                      display: flex;
                                      gap: 8px;
                                    }
                                    .btn {
                                      padding: 10px 20px;
                                      cursor: pointer;
                                      background: #1e3a5f;
                                      color: white;
                                      border: none;
                                      border-radius: 6px;
                                      font-weight: 600;
                                      font-size: 13px;
                                    }
                                    .btn:hover { background: #162036; }
                                    .btn-secondary {
                                      background: white;
                                      color: #1e3a5f;
                                      border: 1px solid #d1d5db;
                                    }
                                    .btn-secondary:hover { background: #f3f4f6; }
                                    @media print {
                                      body { background: white; }
                                      .actions { display: none; }
                                      .report-container { box-shadow: none; }
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="report-container">
                                    <div class="header">
                                      <div class="header-left">
                                        <h1>${reportTitles[aiReportType]}</h1>
                                        <div class="subtitle">${monthNames[reportMonth]} ${reportYear} Report</div>
                                      </div>
                                      <div class="header-right">
                                        <div class="org">Epworth Family Resources</div>
                                        <div class="date">Generated ${new Date().toLocaleDateString()}</div>
                                      </div>
                                    </div>
                                    <div class="content-area">
                                      <div class="section-title">Key Performance Indicators</div>
                                      ${kpiCardsHtml}
                                      <div class="section-title">Analysis & Insights</div>
                                      <div class="report-content">${reportText}</div>
                                      <div class="footer">
                                        <div>Confidential - For Internal Use Only</div>
                                        <div>Epworth Family Resources | ${monthNames[reportMonth]} ${reportYear}</div>
                                      </div>
                                    </div>
                                    <div class="actions">
                                      <button class="btn" onclick="window.print()">Print Report</button>
                                      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.querySelector('.report-content').innerText).then(()=>alert('Copied to clipboard!'))">Copy Text</button>
                                    </div>
                                  </div>
                                  <scr` + `ipt>
                                    // Auto-print after page fully loads
                                    window.onload = function() {
                                      setTimeout(function() {
                                        try {
                                          window.print();
                                        } catch(e) {
                                          console.log('Print dialog blocked or failed');
                                        }
                                      }, 800);
                                    };
                                  </scr` + `ipt>
                                </body>
                                </html>
                              `);
                              reportWindow.document.close();
                              showToast("Report generated - print dialog opening!");
                            } catch (err) {
                              showToast("Failed to generate report: " + (err?.message || err));
                            } finally {
                              setAiReportLoading(false);
                            }
                          }}
                        >
                          {aiReportLoading ? "Generating..." : "Generate AI Report"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
                </div>
              )}
            </div>

            </>)}

          </div>
        );
      };

      // Audit Log View - Track all system actions
      const AuditLogView = () => {
        const formatTimestamp = (timestamp) => {
          if (!timestamp) return "—";
          const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
          return date.toLocaleString();
        };

        const getActionColor = (action) => {
          switch (action) {
            case "created": return "bg-green-100 text-green-800";
            case "updated": return "bg-blue-100 text-blue-800";
            case "deleted": return "bg-red-100 text-red-800";
            case "delete_attempt": return "bg-orange-100 text-orange-800";
            case "imported": return "bg-purple-100 text-purple-800";
            case "exported": return "bg-yellow-100 text-yellow-800";
            case "login": return "bg-teal-100 text-teal-800";
            case "logout": return "bg-gray-100 text-gray-800";
            case "unauthorized_access": return "bg-red-200 text-red-900";
            case "failed_login": return "bg-red-200 text-red-900";
            case "view_changed": return "bg-indigo-100 text-indigo-800";
            default: return "bg-gray-100 text-gray-800";
          }
        };

        const getSeverityColor = (severity) => {
          switch (severity) {
            case "critical": return "bg-red-500 text-white";
            case "high": return "bg-orange-500 text-white";
            case "medium": return "bg-yellow-500 text-white";
            case "low": return "bg-green-500 text-white";
            default: return "bg-gray-400 text-white";
          }
        };

        const getCategoryIcon = (category) => {
          switch (category) {
            case "entry": return "FileText";
            case "profile": return "Users";
            case "contact": return "Phone";
            case "user": return "User";
            case "system": return "Settings";
            case "security": return "Shield";
            default: return "Activity";
          }
        };

        const filteredLogs = auditLogFilter === "all"
          ? auditLogs
          : auditLogs.filter(log => {
              if (auditLogFilter === "entries") return log.category === "entry";
              if (auditLogFilter === "profiles") return log.category === "profile";
              if (auditLogFilter === "contacts") return log.category === "contact";
              if (auditLogFilter === "users") return log.category === "user";
              if (auditLogFilter === "security") return log.category === "security" || log.severity === "critical" || log.severity === "high";
              if (auditLogFilter === "odd_hours") return log.odd_hours === true;
              return true;
            });

        return (
          <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Audit Log</h2>
              <div className="flex gap-2 flex-wrap">
                {["all", "security", "odd_hours", "entries", "profiles", "contacts", "users"].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setAuditLogFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      auditLogFilter === filter
                        ? filter === "security" ? "bg-red-600 text-white" : filter === "odd_hours" ? "bg-orange-600 text-white" : "bg-[var(--brand-navy)] text-white"
                        : filter === "security" ? "bg-red-100 text-red-700 hover:bg-red-200" : filter === "odd_hours" ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter === "odd_hours" ? "Odd Hours" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loadingAuditLogs ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-navy)]"></div>
                <span className="ml-3 text-gray-600">Loading audit logs...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <LucideIcon name="History" className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">No audit logs found.</p>
                <p className="text-gray-500 text-sm mt-1">Activity will be recorded here as users interact with the system.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${log.severity === "critical" ? "bg-red-50" : log.severity === "high" ? "bg-orange-50" : log.odd_hours ? "bg-yellow-50" : ""}`}>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {formatTimestamp(log.timestamp)}
                              {log.odd_hours && (
                                <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-orange-200 text-orange-800" title="Activity outside normal hours (7AM-9PM)">
                                  <LucideIcon name="Moon" className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {log.user_email || "Unknown"}
                          </td>
                          <td className="px-4 py-3">
                            {log.severity && (
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getSeverityColor(log.severity)}`}>
                                {log.severity}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                              {log.action?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <LucideIcon name={getCategoryIcon(log.category)} className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 capitalize">{log.category}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                            <div className="space-y-1">
                              {log.details?.family_name && <span className="block">Family: {log.details.family_name}</span>}
                              {log.details?.service_type && <span className="block">Service: {log.details.service_type}</span>}
                              {log.details?.service_date && <span className="block">Date: {log.details.service_date}</span>}
                              {log.details?.contacted_parties && <span className="block">Parties: {log.details.contacted_parties.join(", ")}</span>}
                              {log.details?.reason && <span className="block text-red-600 font-medium">Reason: {log.details.reason}</span>}
                              {log.details?.attempted_email && <span className="block text-red-600">Attempted email: {log.details.attempted_email}</span>}
                              {log.details?.from_view && log.details?.to_view && <span className="block">View: {log.details.from_view} → {log.details.to_view}</span>}
                              {log.details?.is_admin !== undefined && <span className="block">Admin: {log.details.is_admin ? "Yes" : "No"}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                  Showing {filteredLogs.length} of {auditLogs.length} total logs
                </div>
              </div>
            )}
          </div>
        );
      };

      // Documentation & AI Reports View
      const DocsReportsView = () => {
        const [docAnalysisType, setDocAnalysisType] = useState("case-summary");
        const [selectedFamily, setSelectedFamily] = useState("");
        const [dateRangeStart, setDateRangeStart] = useState("");
        const [dateRangeEnd, setDateRangeEnd] = useState("");
        const [customPrompt, setCustomPrompt] = useState("");
        const [analysisLoading, setAnalysisLoading] = useState(false);
        const [analysisResult, setAnalysisResult] = useState("");
        const [selectedWorker, setSelectedWorker] = useState("");

        // Executive report state
        const [execReportScope, setExecReportScope] = useState("all");
        const [execReportLoading, setExecReportLoading] = useState(false);
        const [execReportResult, setExecReportResult] = useState("");
        const [execWeekStart, setExecWeekStart] = useState(() => {
          const today = new Date();
          const day = today.getDay();
          const monday = new Date(today);
          monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
          return monday.toISOString().split("T")[0];
        });
        const [execWeekEnd, setExecWeekEnd] = useState(() => {
          const today = new Date();
          const day = today.getDay();
          const monday = new Date(today);
          monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          return sunday.toISOString().split("T")[0];
        });

        // Filter entries based on selection
        const getFilteredEntries = () => {
          let filtered = entries.filter(e => !e.is_archived);

          if (selectedFamily) {
            filtered = filtered.filter(e => entryMatchesClient(e, selectedFamily));
          }

          if (selectedWorker) {
            filtered = filtered.filter(e => normalize(e.worker_name) === selectedWorker);
          }

          if (dateRangeStart) {
            filtered = filtered.filter(e => e.date >= dateRangeStart);
          }

          if (dateRangeEnd) {
            filtered = filtered.filter(e => e.date <= dateRangeEnd);
          }

          return filtered.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        };

        const filteredEntries = getFilteredEntries();

        const analysisTypes = [
          { id: "combined-report", name: "Combined Report", description: "Full report: case summary, services, progress, and goal tracking" },
          { id: "case-summary", name: "Case Summary", description: "Generate a comprehensive summary of case notes for a family" },
          { id: "progress-report", name: "Progress Report", description: "Analyze progress and trends over time" },
          { id: "service-analysis", name: "Service Analysis", description: "Analyze services provided and patterns" },
          { id: "goal-tracking", name: "Goal Tracking Analysis", description: "Track progress toward family goals" },
          { id: "safety-review", name: "Safety Concerns Review", description: "Review and summarize safety-related documentation" },
          { id: "worker-summary", name: "Worker Activity Summary", description: "Summarize a worker's documentation" },
          { id: "custom", name: "Custom Analysis", description: "Write your own prompt for AI analysis" },
        ];

        const handleGenerateAnalysis = async () => {
          if (filteredEntries.length === 0) {
            showToast("No entries match your filters. Please adjust your selection.");
            return;
          }

          setAnalysisLoading(true);
          setAnalysisResult("");

          // Build documentation data - truncate long fields to keep prompt within token limits
          const truncate = (text, max = 500) => {
            const s = String(text || "").trim();
            return s.length > max ? s.slice(0, max) + "..." : s;
          };
          const docData = filteredEntries.slice(0, 25).map(e => {
            const base = {
              date: e.date,
              family: e.family_name,
              worker: e.worker_name,
              serviceType: e.service_type,
              contactType: e.contact_type,
              narrative: truncate(e.visit_narrative, 600),
              interventions: truncate(e.interventions, 400),
              plan: truncate(e.plan, 300),
              interactions: truncate(e.interactions, 300),
              parentingSkills: truncate(e.parenting_skills, 300),
              goalsProgress: truncate(e.goals_progress, 400),
              safetyConcern: e.safety_concern_present,
              safetyConcernDesc: truncate(e.safety_concern_description, 300),
              participants: e.participants || "",
            };
            // Include drug testing fields when present
            if (e.chain_of_custody) base.chainOfCustody = e.chain_of_custody;
            if (e.test_result) base.testResult = e.test_result;
            if (e.sp_test_result) base.sweatPatchResult = e.sp_test_result;
            if (e.drugs_tested_positive) base.drugsTestedPositive = e.drugs_tested_positive;
            if (e.sp_drugs_tested_positive) base.spDrugsTestedPositive = e.sp_drugs_tested_positive;
            if (e.client_admitted_use) base.clientAdmittedUse = e.client_admitted_use;
            if (e.sp_client_admitted_use) base.spClientAdmittedUse = e.sp_client_admitted_use;
            if (e.non_admission_explanation) base.nonAdmissionExplanation = truncate(e.non_admission_explanation, 300);
            if (e.sp_non_admission_explanation) base.spNonAdmissionExplanation = truncate(e.sp_non_admission_explanation, 300);
            if (e.refusal_reason) base.refusalReason = truncate(e.refusal_reason, 300);
            if (e.sp_tampered_explanation) base.tamperedExplanation = truncate(e.sp_tampered_explanation, 300);
            if (e.patch_removed) base.patchRemoved = e.patch_removed;
            if (e.new_patch_applied) base.newPatchApplied = e.new_patch_applied;
            if (e.test_mailed) base.testMailed = e.test_mailed;
            if (e.sp_date_sent) base.dateSent = e.sp_date_sent;
            // Cancellation fields
            if (e.cancellation_notification) base.cancellationNotification = truncate(e.cancellation_notification, 300);
            if (e.cancellation_pre_call) base.cancellationPreCall = truncate(e.cancellation_pre_call, 300);
            if (e.cancellation_en_route) base.cancellationEnRoute = e.cancellation_en_route;
            if (e.cancellation_will_makeup) base.willMakeup = e.cancellation_will_makeup;
            if (e.cancellation_makeup_date) base.makeupDate = e.cancellation_makeup_date;
            // Engagement/admission
            if (e.client_admission) base.clientAdmission = truncate(e.client_admission, 300);
            if (e.engagement) base.engagement = truncate(e.engagement, 300);
            return base;
          });
          const totalEntriesNote = filteredEntries.length > 25 ? `\n\nNote: Showing 25 of ${filteredEntries.length} total entries.\n` : "";
          const docJson = JSON.stringify(docData);

          const prompts = {
            "combined-report": `Generate a thorough combined report for ${selectedFamily ? "the selected family" : "all families"} based on these case notes:${totalEntriesNote}\n\n${docJson}\n\nThis report will be handed directly to a DHHS caseworker. It needs to be comprehensive, specific, and useful.\n\nUse ALL CAPS for section headers. Cover all of the following sections in order:\n\nCASE SUMMARY\n- Family name, dates covered, workers involved\n- Each appointment actually delivered: date, service type, contact type, who was present\n- For drug testing visits: test type, result, chain of custody status, substances identified, client response\n- Key themes from visit narratives\n- Family strengths observed\n- Concerns or challenges documented\n\nSERVICE DELIVERY ANALYSIS\n- Count of appointments by service type (OHFS, IHFS, PTSV, DST-U, DST-MS, DST-SP, etc.)\n- Count by contact type (face-to-face, virtual, phone)\n- Frequency and consistency of services\n- Cancellation/no-show patterns and whether makeups were scheduled\n- If drug testing: number of tests, types, and results summary\n- Service gaps — stretches with no contact or services that should be happening but aren't\n\nPROGRESS REPORT\n- Observable progress and improvements — cite specific visits and dates\n- Challenges or setbacks — be honest\n- Changes in family dynamics, engagement, or circumstances over time\n- Compare earlier visits to recent ones — is the trend positive, flat, or declining?\n- If drug testing data is present: chronological summary of all test results\n\nGOAL TRACKING\n- List each goal documented in the notes\n- For each goal: which visits addressed it, what was done, what progress was observed\n- Barriers to goal achievement with specific examples\n- Which goals are on track, stalled, or need a different approach\n- If drug testing relates to goals (sobriety, compliance): connect test results to goal progress\n\nRECOMMENDATIONS\n- Professional recommendations for continued services, goal plan adjustments, and areas needing attention\n\nBe specific throughout — use actual dates, observations, and data from the notes. Do not generalize or pad with filler.`,

            "case-summary": `Case summary for ${selectedFamily ? "the selected family" : "all families"} based on these case notes:${totalEntriesNote}\n\n${docJson}\n\nThis report will be handed directly to a DHHS caseworker. Write it so it's specific and useful to them.\n\nStart with the basics:\n- Family name, dates covered, workers involved\n- List each appointment that was actually delivered: date, service type, contact type, who was present\n- For drug testing visits (DST-U, DST-MS, DST-SP, DST-HF): report the test type, result (positive/negative/refusal/tampered), chain of custody status, any substances identified, and client response\n\nThen provide:\n1. Summary of what actually happened during this period — what services were delivered, what was observed\n2. Key themes from the visit narratives\n3. Family strengths observed in the notes\n4. Concerns or challenges documented\n5. Progress noted over the time period\n6. Recommendations for continued services\n\nOnly include information that is actually in the case notes. Do not generalize or pad with filler. If drug testing data is present, always include a testing summary section with results.`,

            "progress-report": `Progress report based on these case notes:${totalEntriesNote}\n\n${docJson}\n\nThis report needs to be specific enough for a court report or agency review.\n\nStart with the facts:\n- Dates covered, services delivered, number of completed visits vs cancellations/no-shows\n- List each visit with date, service type, and what happened\n\nThen analyze:\n1. Observable progress and improvements — cite specific visits and observations\n2. Challenges or setbacks encountered — be honest and specific\n3. Goal-related progress — what goals were worked on and what movement was seen\n4. Changes in family dynamics, engagement level, or circumstances over time\n5. If drug testing data is present: summarize all test results chronologically with outcomes\n6. Compare earlier visits to more recent ones — is the trend positive, flat, or declining?\n7. Professional recommendations based on what the data shows\n\nDon't sugarcoat or pad. A caseworker needs to know what actually happened.`,

            "service-analysis": `Service analysis based on these case notes:${totalEntriesNote}\n\n${docJson}\n\nBreak down exactly what services were provided:\n\n1. List every appointment: date, service type, contact type, worker, outcome (completed/cancelled/no-show)\n2. Count by service type — how many of each (OHFS, IHFS, PTSV, DST-U, DST-MS, DST-SP, etc.)\n3. Count by contact type — face-to-face, virtual, phone, etc.\n4. Frequency — how often were services happening? Weekly? Less?\n5. Cancellation/no-show patterns — who cancelled, how often, were makeups scheduled?\n6. If drug testing: how many tests, what types, results summary\n7. Interventions used across visits\n8. Gaps — were there stretches with no contact? Services that should be happening but aren't?\n9. Recommendations for service delivery going forward\n\nUse actual numbers and dates. This should read like a service log summary a supervisor would hand to a caseworker.`,

            "goal-tracking": `Goal tracking analysis based on these case notes:${totalEntriesNote}\n\n${docJson}\n\nFocus specifically on goals and progress:\n\n1. What goals are documented in these notes? List each one.\n2. For each goal: what specific visits addressed it, what was done, and what progress was observed?\n3. Barriers getting in the way of goal achievement — cite specific examples from the notes\n4. Interventions the FLS used to support each goal\n5. Where do things stand right now — which goals are on track, which are stalled, which need a different approach?\n6. If drug testing is relevant to goals (sobriety, compliance): include test results and how they relate to goal progress\n7. Recommendations for adjusting the goal plan\n\nBe specific — reference actual visit dates and observations. A caseworker should be able to read this and know exactly where the family stands on each goal.`,

            "safety-review": `Safety concerns review based on these case notes:${totalEntriesNote}\n\n${docJson}\n\nThis is a focused safety review. Be thorough and direct.\n\n1. List every visit where safety concerns were documented: date, what was observed, how it was addressed\n2. List visits where safety was assessed and NO concerns were noted (this matters too)\n3. If drug testing data is present: report all results — positive results are safety-relevant, include substances identified and client response\n4. Patterns — are concerns recurring, escalating, or improving?\n5. Protective factors observed in the home/family\n6. Risk factors that need continued monitoring\n7. Were appropriate notifications made when concerns arose?\n8. Recommendations for safety planning\n\nDo not soften safety concerns. A caseworker needs the straight facts. If there are serious concerns, say so clearly.`,

            "worker-summary": `Worker activity summary based on these case notes:${totalEntriesNote}\n\n${docJson}\n\nSummarize what this worker (or workers) actually did:\n\n1. Families served and number of visits per family\n2. Breakdown of services delivered by type\n3. Visit completion rate — completed vs cancelled/no-show\n4. Common interventions and approaches used\n5. If drug testing was conducted: number of tests, types, and results\n6. Quality of documentation — are narratives detailed? Are required fields filled in?\n7. Strengths in their work and documentation\n8. Areas where documentation or service delivery could improve\n\nKeep it constructive — this is for a supervision conversation, not a write-up.`,

            "custom": customPrompt + `\n\nBase your analysis on these case notes:${totalEntriesNote}\n\n${docJson}`,
          };

          const prompt = prompts[docAnalysisType] || prompts["case-summary"];

          try {
            const response = await authFetch("/api/generateReport", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || result?.error) {
              throw new Error(result?.error || `API error: ${response.status}`);
            }

            const analysisText = result?.text || "Unable to generate analysis. Please try again.";
            setAnalysisResult(analysisText);
            showToast("Analysis generated — print dialog opening!");
            const reportTitle = analysisTypes.find(t => t.id === docAnalysisType)?.name || "Documentation Analysis";
            const docFamilyProfile = selectedFamily ? activeFamilyDirectoryOptions.find(f => f.key === selectedFamily) : null;
            const docServiceTypes = selectedFamily
              ? [...new Set(filteredEntries.map(e => e.service_type).filter(Boolean))]
              : [];
            const docEndDate = dateRangeEnd ? new Date(dateRangeEnd + "T00:00:00") : new Date();
            openBrandedReport({
              title: reportTitle,
              subtitle: "Documentation & AI Analysis",
              metaLines: [
                selectedFamily ? `Family: ${docFamilyProfile?.caseName || selectedFamily}` : "All Families",
                dateRangeStart || dateRangeEnd ? `Date Range: ${dateRangeStart || "Start"} to ${dateRangeEnd || "Present"}` : "All Dates",
                `Entries Analyzed: ${filteredEntries.length}`,
              ],
              text: analysisText,
              fileName: buildReportFileName({
                familyName: docFamilyProfile?.caseName || "",
                mcNumber: docFamilyProfile?.mcNumber || "",
                serviceTypes: docServiceTypes,
                month: docEndDate.toLocaleString("en-US", { month: "long" }),
                year: String(docEndDate.getFullYear()),
                reportType: reportTitle,
              }),
            });
          } catch (err) {
            console.error("Analysis error:", err);
            setAnalysisResult(`Error generating analysis: ${err.message}`);
            showToast("Failed to generate analysis");
          } finally {
            setAnalysisLoading(false);
          }
        };

        const handleCopyResult = () => {
          navigator.clipboard.writeText(analysisResult);
          showToast("Copied to clipboard!");
        };

        const handlePrintResult = () => {
          const reportTitle = analysisTypes.find(t => t.id === docAnalysisType)?.name || "Documentation Analysis";
          const docFamilyProfile = selectedFamily ? activeFamilyDirectoryOptions.find(f => f.key === selectedFamily) : null;
          const docServiceTypes = selectedFamily
            ? [...new Set(filteredEntries.map(e => e.service_type).filter(Boolean))]
            : [];
          const docEndDate = dateRangeEnd ? new Date(dateRangeEnd + "T00:00:00") : new Date();
          openBrandedReport({
            title: reportTitle,
            subtitle: "Documentation & AI Analysis",
            metaLines: [
              selectedFamily ? `Family: ${docFamilyProfile?.caseName || selectedFamily}` : "All Families",
              dateRangeStart || dateRangeEnd ? `Date Range: ${dateRangeStart || "Start"} to ${dateRangeEnd || "Present"}` : "All Dates",
              `Entries Analyzed: ${filteredEntries.length}`,
            ],
            text: analysisResult,
            fileName: buildReportFileName({
              familyName: docFamilyProfile?.caseName || "",
              mcNumber: docFamilyProfile?.mcNumber || "",
              serviceTypes: docServiceTypes,
              month: docEndDate.toLocaleString("en-US", { month: "long" }),
              year: String(docEndDate.getFullYear()),
              reportType: reportTitle,
            }),
          });
        };

        const handleGenerateExecutiveReport = async () => {
          // Filter entries to the selected week
          let weekEntries = entries.filter(e => !e.is_archived && e.date >= execWeekStart && e.date <= execWeekEnd);

          if (execReportScope === "single") {
            if (!selectedFamily) {
              showToast("Please select a family for the single-case report.");
              return;
            }
            weekEntries = weekEntries.filter(e => entryMatchesClient(e, selectedFamily));
          }

          if (weekEntries.length === 0) {
            showToast("No entries found for the selected week. Please adjust the date range.");
            return;
          }

          setExecReportLoading(true);
          setExecReportResult("");

          const truncate = (text, max = 400) => {
            const s = String(text || "").trim();
            return s.length > max ? s.slice(0, max) + "..." : s;
          };

          // Group entries by family
          const familyGroups = {};
          for (const e of weekEntries) {
            const familyKey = normalize(e.family_directory_key) || normalize(e.family_name) || "unknown";
            if (!familyGroups[familyKey]) familyGroups[familyKey] = [];
            familyGroups[familyKey].push(e);
          }

          // Build case profiles
          const maxCases = execReportScope === "all" ? 20 : 1;
          const maxEntriesPerCase = execReportScope === "all" ? 5 : 15;
          const narrativeMax = execReportScope === "single" ? 500 : 250;

          const activeFamilies = familyDirectoryOptions.filter(o => !o.isArchived);
          const familyKeys = Object.keys(familyGroups).slice(0, maxCases);

          // Format worker name as "FLS LastName"
          const toFLSName = (name) => {
            const n = String(name || "").trim();
            if (!n) return "";
            const parts = n.split(/\s+/);
            const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
            return `FLS ${lastName}`;
          };

          const caseProfiles = familyKeys.map(key => {
            const caseEntries = familyGroups[key].slice(0, maxEntriesPerCase);
            const familyOpt = activeFamilies.find(f => f.key === key) || familyDirectoryOptions.find(f => f.key === key);
            const serviceTypes = [...new Set(caseEntries.map(e => e.service_type).filter(Boolean))];
            const workers = [...new Set(caseEntries.map(e => e.worker_name).filter(Boolean))].map(toFLSName);
            const safetyConcerns = caseEntries
              .filter(e => e.safety_concern_present === "Yes" || e.safety_concern_present === true)
              .map(e => truncate(e.safety_concern_description, 200))
              .filter(Boolean);

            return {
              familyName: familyOpt?.caseName || key,
              mcNumber: familyOpt?.mcNumber || "",
              goalsText: truncate(familyOpt?.goalsText || "", 400),
              serviceTypes,
              workers,
              entryCount: familyGroups[key].length,
              safetyConcerns,
              entries: caseEntries.map(e => ({
                date: e.date,
                serviceType: e.service_type || "",
                contactType: e.contact_type || "",
                worker: toFLSName(e.worker_name),
                narrative: truncate(e.visit_narrative, narrativeMax),
                goalsProgress: truncate(e.goals_progress, narrativeMax),
                interventions: truncate(e.interventions, narrativeMax),
                plan: truncate(e.plan, execReportScope === "single" ? 300 : 200),
                interactions: truncate(e.interactions, execReportScope === "single" ? 300 : 200),
                parentingSkills: truncate(e.parenting_skills, execReportScope === "single" ? 300 : 200),
                safetyConcernDesc: truncate(e.safety_concern_description, 200),
              })),
            };
          });

          // Gather authorization alerts — only for services the family actually receives (has case notes for)
          const authorizationAlerts = [];
          const today = new Date();
          const alertWindow = new Date(today);
          alertWindow.setDate(today.getDate() + 14);

          // Build a map of family key → service types from case notes
          const familyServiceMap = {};
          for (const profile of caseProfiles) {
            const famKey = familyKeys.find(k => {
              const fOpt = activeFamilies.find(f => f.key === k) || familyDirectoryOptions.find(f => f.key === k);
              return fOpt?.caseName === profile.familyName;
            });
            if (famKey) familyServiceMap[famKey] = profile.serviceTypes.map(s => String(s || "").toUpperCase());
          }

          for (const fam of activeFamilies) {
            const caseNoteServices = familyServiceMap[fam.key] || [];
            // If no case notes for this family, skip (no evidence of active services)
            if (caseNoteServices.length === 0) continue;

            const history = Array.isArray(fam.raw?.Authorization_History) ? fam.raw.Authorization_History : [];
            for (const auth of history) {
              if (auth.end_date) {
                const authSvc = String(auth.service_type || "").toUpperCase();
                // Only include if authorization matches a service the family actually receives
                const matchesService = !authSvc || authSvc === "GENERAL"
                  || caseNoteServices.some(svc => {
                    if (authSvc.startsWith("DST") && svc.startsWith("DST")) return true;
                    return authSvc === svc;
                  });
                if (!matchesService) continue;

                const endDate = new Date(auth.end_date);
                if (endDate >= today && endDate <= alertWindow) {
                  authorizationAlerts.push({
                    familyName: fam.caseName,
                    serviceType: auth.service_type || "General",
                    endDate: auth.end_date,
                  });
                }
              }
            }
          }

          try {
            const response = await authFetch("/api/generateExecutiveReport", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scope: execReportScope,
                weekStart: execWeekStart,
                weekEnd: execWeekEnd,
                caseProfiles,
                authorizationAlerts,
              }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || result?.error) {
              throw new Error(result?.error || `API error: ${response.status}`);
            }

            const reportText = result?.text || "Unable to generate report. Please try again.";
            setExecReportResult(reportText);
            showToast("Executive report generated — print dialog opening!");
            const execFamilyProfile = execReportScope === "single" ? activeFamilyDirectoryOptions.find(f => f.key === selectedFamily) : null;
            const scopeLabel = execReportScope === "single"
              ? `Case Deep-Dive: ${execFamilyProfile?.caseName || selectedFamily}`
              : "All Active Cases — Executive Overview";
            const execEndDate = execWeekEnd ? new Date(execWeekEnd + "T00:00:00") : new Date();
            openBrandedReport({
              title: "Weekly Executive Report",
              subtitle: scopeLabel,
              metaLines: [
                `Reporting Period: ${execWeekStart} to ${execWeekEnd}`,
              ],
              text: reportText,
              fileName: buildReportFileName({
                familyName: execFamilyProfile?.caseName || "",
                mcNumber: execFamilyProfile?.mcNumber || "",
                serviceTypes: "",
                month: execEndDate.toLocaleString("en-US", { month: "long" }),
                year: String(execEndDate.getFullYear()),
                reportType: "Executive Report",
              }),
            });
          } catch (err) {
            console.error("Executive report error:", err);
            setExecReportResult(`Error generating report: ${err.message}`);
            showToast("Failed to generate executive report");
          } finally {
            setExecReportLoading(false);
          }
        };

        // Shared branded report print window
        const openBrandedReport = ({ title, subtitle, metaLines, text, fileName }) => {
          if (!text) return;
          const printWindow = window.open("", "_blank", "width=850,height=700");
          if (!printWindow) { showToast("Pop-up blocked — please allow pop-ups for this site."); return; }

          // Clean markdown artifacts from text before parsing
          const cleanMarkdown = (str) => {
            return str
              .replace(/\*\*\*(.*?)\*\*\*/g, "$1")  // ***bold italic***
              .replace(/\*\*(.*?)\*\*/g, "$1")        // **bold**
              .replace(/\*(.*?)\*/g, "$1")             // *italic*
              .replace(/^#{1,6}\s+/gm, "")             // # headings
              .replace(/^[-*]\s+/gm, "- ")             // normalize bullet styles
              .replace(/`([^`]+)`/g, "$1");             // `code`
          };

          const cleanedText = cleanMarkdown(text);

          // Parse sections by ALL CAPS headers or **Markdown Bold** headers
          const lines = cleanedText.split("\n");
          let sections = [];
          let currentSection = { title: "", content: "" };
          for (const line of lines) {
            const trimmed = line.trim();
            // Check for ALL CAPS header (existing logic)
            const isAllCapsHeader = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed) && !/^\d+\.$/.test(trimmed);
            // Check for numbered section header like "1. HEADER" or "1. Header Text"
            const numberedMatch = trimmed.match(/^\d+\.\s+([A-Z][A-Z\s&—\-:]+)$/);
            const isNumberedHeader = numberedMatch && numberedMatch[1].length > 3;

            if (isAllCapsHeader || isNumberedHeader) {
              if (currentSection.title || currentSection.content.trim()) sections.push({ ...currentSection });
              const headerText = isNumberedHeader ? numberedMatch[1].trim() : trimmed;
              currentSection = { title: headerText, content: "" };
            } else {
              currentSection.content += line + "\n";
            }
          }
          if (currentSection.title || currentSection.content.trim()) sections.push(currentSection);

          let sectionsHtml = "";
          if (sections.length > 1) {
            for (const section of sections) {
              if (section.title) sectionsHtml += `<div class="section-title">${section.title}</div>`;
              if (section.content.trim()) sectionsHtml += `<div class="section-content">${section.content.trim().replace(/\n/g, "<br/>")}</div>`;
            }
          } else {
            sectionsHtml = `<div class="section-content">${text.replace(/\n/g, "<br/>")}</div>`;
          }

          const metaHtml = (metaLines || []).filter(Boolean).join("<br/>");

          printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${fileName || title + " - Epworth Family Resources"}</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; color: #1a1a1a; background: #f8fafc; }
    .report-container { max-width: 800px; margin: 0 auto; background: white; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
    .header-left h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header-left .subtitle { margin-top: 4px; font-size: 13px; opacity: 0.85; font-weight: 400; }
    .header-right { text-align: right; }
    .header-right .org { font-size: 14px; font-weight: 600; opacity: 0.95; }
    .header-right .date { font-size: 12px; opacity: 0.75; margin-top: 2px; }
    .content-area { padding: 24px 32px; }
    .meta-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #64748b; line-height: 1.7; }
    .section-title { font-size: 13px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .section-title:first-child { margin-top: 0; }
    .section-content { font-size: 13px; line-height: 1.7; color: #374151; margin-bottom: 12px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #c89a2a; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #9ca3af; }
    .footer .confidential { color: #c89a2a; font-weight: 700; font-size: 11px; }
    .actions { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; }
    .btn { padding: 10px 20px; cursor: pointer; background: #1e3a5f; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; }
    .btn:hover { background: #162036; }
    .btn-secondary { background: white; color: #1e3a5f; border: 1px solid #1e3a5f; }
    .btn-secondary:hover { background: #f1f5f9; }
    @media print { body { background: white; } .actions { display: none; } .report-container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="header-left">
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
      </div>
      <div class="header-right">
        <div class="org">Epworth Family Resources</div>
        <div class="date">Generated ${new Date().toLocaleDateString()}</div>
      </div>
    </div>
    <div class="content-area">
      ${metaHtml ? `<div class="meta-block">${metaHtml}</div>` : ""}
      ${sectionsHtml}
      <div class="footer">
        <div class="confidential">CONFIDENTIAL — FOR INTERNAL USE ONLY</div>
        <div>Epworth Family Resources</div>
      </div>
    </div>
    <div class="actions">
      <button class="btn" onclick="window.print()">Print Report</button>
      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.querySelector('.content-area').innerText).then(()=>alert('Copied to clipboard!'))">Copy Text</button>
    </div>
  </div>
  <scr` + `ipt>
    window.onload = function() {
      setTimeout(function() { try { window.print(); } catch(e) {} }, 800);
    };
  </scr` + `ipt>
</body>
</html>`);
          printWindow.document.close();
        };

        const handlePrintExecutiveReport = () => {
          const execFamilyProfile = execReportScope === "single" ? familyDirectoryOptions.find(f => f.key === selectedFamily) : null;
          const scopeLabel = execReportScope === "single"
            ? `Case Deep-Dive: ${execFamilyProfile?.caseName || selectedFamily}`
            : "All Active Cases — Executive Overview";
          const execEndDate = execWeekEnd ? new Date(execWeekEnd + "T00:00:00") : new Date();
          openBrandedReport({
            title: "Weekly Executive Report",
            subtitle: scopeLabel,
            metaLines: [
              `Reporting Period: ${execWeekStart} to ${execWeekEnd}`,
            ],
            text: execReportResult,
            fileName: buildReportFileName({
              familyName: execFamilyProfile?.caseName || "",
              mcNumber: execFamilyProfile?.mcNumber || "",
              serviceTypes: "",
              month: execEndDate.toLocaleString("en-US", { month: "long" }),
              year: String(execEndDate.getFullYear()),
              reportType: "Executive Report",
            }),
          });
        };

        const handleCopyExecResult = () => {
          navigator.clipboard.writeText(execReportResult);
          showToast("Executive report copied to clipboard!");
        };

        return (
          <div className="w-full space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Documentation & AI Reports</h2>
              <p className="text-gray-600">Use AI to analyze case notes, generate summaries, and create reports from your documentation.</p>
            </div>

            {/* Weekly Executive Report */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <LucideIcon name="BarChart3" className="w-6 h-6 text-[#1E3A5F]" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Weekly Executive Report</h3>
                  <p className="text-sm text-gray-500">AI-powered weekly analysis for leadership review</p>
                </div>
              </div>

              {/* Scope Toggle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Scope</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExecReportScope("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      execReportScope === "all"
                        ? "border-[#1E3A5F] bg-blue-50 text-[#1E3A5F] shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    All Active Cases
                  </button>
                  <button
                    onClick={() => setExecReportScope("single")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      execReportScope === "single"
                        ? "border-[#1E3A5F] bg-blue-50 text-[#1E3A5F] shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Single Case Deep-Dive
                  </button>
                </div>
              </div>

              {/* Family Selector (single-case only) */}
              {execReportScope === "single" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Family</label>
                  <select
                    value={selectedFamily}
                    onChange={(e) => setSelectedFamily(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">— Select a Family —</option>
                    {familyDirectoryOptions.filter(o => !o.isArchived).map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.mcNumber ? `${o.caseName} (${o.mcNumber})` : o.caseName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Week Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Week Start</label>
                  <input
                    type="date"
                    value={execWeekStart}
                    onChange={(e) => setExecWeekStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Week End</label>
                  <input
                    type="date"
                    value={execWeekEnd}
                    onChange={(e) => setExecWeekEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                iconName={execReportLoading ? "Loader2" : "BarChart3"}
                onClick={handleGenerateExecutiveReport}
                disabled={execReportLoading || (execReportScope === "single" && !selectedFamily)}
                className={execReportLoading ? "animate-pulse" : ""}
              >
                {execReportLoading ? "Generating Executive Report..." : "Generate Executive Report"}
              </Button>
            </div>

            {/* Executive Report Results */}
            {execReportResult && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Executive Report</h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" iconName="Copy" onClick={handleCopyExecResult}>
                      Copy
                    </Button>
                    <Button variant="secondary" iconName="Printer" onClick={handlePrintExecutiveReport}>
                      Print
                    </Button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    {execReportResult.split("\n").map((line, i) => {
                      const trimmed = line.trim();
                      const clean = trimmed.replace(/\*\*\*(.*?)\*\*\*/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
                      const isHeader = clean.length > 2 && clean === clean.toUpperCase() && /[A-Z]{3,}/.test(clean) && !/^\d+\.$/.test(clean);
                      const numMatch = clean.match(/^\d+\.\s+([A-Z][A-Z\s&—\-:]+)$/);
                      if (isHeader || numMatch) {
                        return <div key={i} className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wide mt-4 mb-1 pb-1 border-b border-gray-200">{numMatch ? numMatch[1] : clean}</div>;
                      }
                      if (!clean) return <div key={i} className="h-2" />;
                      return <div key={i} className="text-sm text-gray-700 leading-relaxed">{clean}</div>;
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Filters & Options */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Documentation to Analyze</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family</label>
                  <select
                    value={selectedFamily}
                    onChange={(e) => setSelectedFamily(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">All Families</option>
                    {familyDirectoryOptions.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.mcNumber ? `${o.caseName} (${o.mcNumber})` : o.caseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Worker</label>
                  <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">All Workers</option>
                    {workerNames.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <LucideIcon name="FileText" className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">
                  <strong>{filteredEntries.length}</strong> case notes match your filters
                  {filteredEntries.length > 50 && " (first 50 will be analyzed)"}
                </span>
              </div>
            </div>

            {/* Analysis Type Selection */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Analysis Type</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {analysisTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setDocAnalysisType(type.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      docAnalysisType === type.id
                        ? "border-[var(--brand-navy)] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`font-semibold ${docAnalysisType === type.id ? "text-[var(--brand-navy)]" : "text-gray-800"}`}>
                      {type.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  </button>
                ))}
              </div>

              {/* Custom Prompt Input */}
              {docAnalysisType === "custom" && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Analysis Prompt</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)]"
                    placeholder="Enter your custom prompt. For example: 'Identify all mentions of parenting skills and create a summary of strengths and areas for growth...'"
                  />
                </div>
              )}

              <Button
                variant="primary"
                iconName={analysisLoading ? "Loader2" : "Sparkles"}
                onClick={handleGenerateAnalysis}
                disabled={analysisLoading || (docAnalysisType === "custom" && !customPrompt.trim())}
                className={analysisLoading ? "animate-pulse" : ""}
              >
                {analysisLoading ? "Generating Analysis..." : "Generate AI Analysis"}
              </Button>
            </div>

            {/* Results */}
            {analysisResult && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Analysis Results</h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" iconName="Copy" onClick={handleCopyResult}>
                      Copy
                    </Button>
                    <Button variant="secondary" iconName="Printer" onClick={handlePrintResult}>
                      Print
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    {analysisResult.split("\n").map((line, i) => {
                      const trimmed = line.trim();
                      // Clean markdown bold/italic from any line
                      const clean = trimmed.replace(/\*\*\*(.*?)\*\*\*/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
                      // ALL CAPS header
                      const isHeader = clean.length > 2 && clean === clean.toUpperCase() && /[A-Z]{3,}/.test(clean) && !/^\d+\.$/.test(clean);
                      // Numbered header like "1. SECTION NAME"
                      const numMatch = clean.match(/^\d+\.\s+([A-Z][A-Z\s&—\-:]+)$/);
                      if (isHeader || numMatch) {
                        return <div key={i} className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wide mt-4 mb-1 pb-1 border-b border-gray-200">{numMatch ? numMatch[1] : clean}</div>;
                      }
                      if (!clean) return <div key={i} className="h-2" />;
                      return <div key={i} className="text-sm text-gray-700 leading-relaxed">{clean}</div>;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      };

      // Monthly Reports View - Full document forms matching Word templates
      const MonthlyReportsView = () => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const providerPrefix = "The Family Life Specialist from Epworth Family Resources";

        // Get selected profile
        const selectedProfile = activeFamilyDirectoryOptions.find(p => p.key === reportFormClient);

        // Get service types for current report type
        const getServiceTypes = (type) => {
          const t = type || reportFormType;
          if (t === "family_support") return ["OHFS/IHFS", "OHFS", "IHFS"];
          if (t === "ptsv") return ["PTSV", "PTSV-C"];
          if (t === "drug_testing") return ["DST-SP", "DST-U", "DST-MS", "DST-HF"];
          return [];
        };

        // Filter entries for selected client and month
        const getFilteredEntries = (profile, month, year, type) => {
          const p = profile || selectedProfile;
          const m = month !== undefined ? month : reportFormMonth;
          const y = year !== undefined ? year : reportFormYear;
          if (!p) return [];
          const serviceTypes = getServiceTypes(type);
          return entries.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            if (d.getMonth() !== m || d.getFullYear() !== y) return false;
            const entryClient = e.case_name || e.family_id || "";
            const matches = entryClient === p.caseName ||
                           entryClient === p.familyId ||
                           e.mc_number === p.mcNumber;
            if (!matches) return false;
            const svcType = String(e.service_type || "").toUpperCase();
            return serviceTypes.includes(svcType);
          }).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        };

        const normalizeContactType = (entry) => String(entry?.contact_type || entry?.contact || "").trim();

        const getEntryStatus = (entry) => {
          const contactType = normalizeContactType(entry);
          const isCancelled = ["Cancelled by Parent", "Cancelled by Worker", "Cancelled for Weather", "Cancelled by Team", "Cancelled No Confirmation", "Cancelled In Route"].includes(contactType);
          const isNoShow = contactType === "No Show" || contactType === "No-Show";
          const isRescheduled = contactType === "Rescheduled" || entry?.cancellation_will_makeup === "Yes";
          const isEndedEarly = contactType === "Ended Early" || entry?.ended_early === "Yes";

          if (isRescheduled) return "Rescheduled";
          if (isEndedEarly) return "Ended Early";
          if (isCancelled) return "Cancelled";
          if (isNoShow) return "No-Show";
          return "Completed";
        };

        const stripDatePrefix = (text) => String(text || "").replace(/^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}:\s*/, "").trim();

        const toParagraph = (parts, fallback = "") => {
          const cleaned = parts.map((part) => stripDatePrefix(part)).filter(Boolean);
          if (cleaned.length === 0) return fallback;
          return cleaned.join(" ");
        };

        // Parse goal progress from case notes
        const parseGoalProgress = (filteredEntries, goals) => {
          const goalProgress = {};

          goals.forEach((goal, idx) => {
            const goalText = typeof goal === "string" ? goal : String(goal?.text || "");
            if (!goalText) return;
            const goalNum = idx + 1;
            const progressEntries = [];

            // Look for explicit goal progress in entries
            filteredEntries.forEach(e => {
              // Check if this entry has progress for this goal number
              const entryGoal = e[`goal_${goalNum}`];
              const entryProgress = e[`goal_${goalNum}_progress`];

              if (entryProgress) {
                progressEntries.push({
                  date: e.date,
                  progress: entryProgress,
                  rating: entryGoal ? `(${entryGoal})` : ""
                });
              }
            });

            const goalLabel = goalText ? ` Goal ${goalNum} (${goalText}).` : ` Goal ${goalNum}.`;

            if (progressEntries.length > 0) {
              const progressText = toParagraph(
                progressEntries.map(p => p.progress),
                ""
              );
              if (progressText) {
                goalProgress[`goal_${goalNum}_progress`] = `${providerPrefix} focused on${goalLabel} ${progressText}`;
              }
            }

            if (!goalProgress[`goal_${goalNum}_progress`]) {
              const goalKeywords = goalText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
              const relevantNotes = filteredEntries
                .filter(e => {
                  const narrative = (e.visit_narrative || e.session_narrative || "").toLowerCase();
                  return goalKeywords.some(kw => narrative.includes(kw));
                })
                .map(e => e.visit_narrative || e.session_narrative || "");

              const notesText = toParagraph(relevantNotes.slice(0, 3), "");
              if (notesText) {
                goalProgress[`goal_${goalNum}_progress`] = `${providerPrefix} addressed${goalLabel} ${notesText}`;
              }
            }
          });

          return goalProgress;
        };

        // Parse safety concerns from entries
        const parseSafetyInfo = (filteredEntries) => {
          const safetyConcerns = filteredEntries.filter(e => e.safety_concern_present === "Yes");

          if (safetyConcerns.length === 0) {
            return {
              safety_none: true,
              safety_assessment: `${providerPrefix} assessed child safety during each contact. No safety concerns were identified during the reporting period.`
            };
          }

          const assessmentText = toParagraph(
            safetyConcerns.map(e =>
              `${e.safety_concern_description || "Safety concern noted"}. Addressed: ${e.safety_concern_addressed || "See notes"}.`
            ),
            ""
          );

          const notifications = safetyConcerns.flatMap(e =>
            Array.isArray(e.safety_notification) ? e.safety_notification : []
          );

          return {
            safety_none: false,
            safety_cfss: notifications.includes("All Parties") || notifications.includes("Supervisor Only"),
            safety_hotline: notifications.includes("HHS Hotline"),
            safety_assessment: `${providerPrefix} documented safety concerns during this period. ${assessmentText}`
          };
        };

        // Parse drug testing specific data
        const parseDrugTestingData = (filteredEntries) => {
          const collected = filteredEntries.filter(e => e.chain_of_custody === "Yes" && normalizeContactType(e) !== "No Show");
          const noShows = filteredEntries.filter(e => normalizeContactType(e) === "No Show");
          const refusals = filteredEntries.filter(e => e.test_result === "Refusal");
          const admissions = filteredEntries.filter(e => e.client_admitted_use === "Yes");
          const positives = filteredEntries.filter(e => e.test_result === "Positive");

          // Build engagement narrative from notes
          const narratives = filteredEntries
            .filter(e => e.visit_narrative || e.session_narrative || e.plan)
            .map(e => e.visit_narrative || e.session_narrative || e.plan);
          const narrativeText = toParagraph(narratives.slice(0, 3), "");

          return {
            successful_collections: collected.length.toString(),
            no_shows: noShows.length.toString(),
            refusals: refusals.length.toString(),
            admissions: admissions.length.toString(),
            collection_dates: collected.map(e => e.date).join(", "),
            no_show_dates: noShows.map(e => e.date).join(", "),
            refusal_dates: refusals.map(e => e.date).join(", "),
            admission_dates: admissions.map(e => e.date).join(", "),
            // Build default engagement text
            abstinence_discussion: narrativeText
              ? `${providerPrefix} discussed abstinence and case plan expectations with the client. ${narrativeText}`
              : `${providerPrefix} discussed abstinence and case plan expectations with the client during this reporting period.`,
            client_encouragement: collected.length > 0
              ? `${providerPrefix} recognized compliance with testing requirements. The client completed ${collected.length} specimen collection(s) this month.`
              : `${providerPrefix} encouraged the client to remain compliant with testing requirements.`,
            continued_support: `${providerPrefix} continues to provide support and resources to help the client meet sobriety goals.`,
            outcome_of_contacts: (() => {
              const outcomeText = toParagraph(
                filteredEntries.map(e => {
                  const status = e.test_result || (normalizeContactType(e) === "No Show" ? "No-Show" : "Collected");
                  return `${status}. ${e.visit_narrative || e.session_narrative || ""}`;
                }),
                ""
              );
              return outcomeText
                ? `${providerPrefix} documented outcomes of each contact. ${outcomeText}`
                : `${providerPrefix} documented outcomes for each contact during this reporting period.`;
            })()
          };
        };

        // Comprehensive auto-populate from case notes
        const autoPopulateFromNotes = (profile, month, year, type) => {
          const p = profile || selectedProfile;
          const m = month !== undefined ? month : reportFormMonth;
          const y = year !== undefined ? year : reportFormYear;
          const t = type || reportFormType;

          if (!p) return;

          setReportAutoPopulating(true);

          const filteredEntries = getFilteredEntries(p, m, y, t);

          // Build session log from entries
          const sessionLog = filteredEntries.map(e => {
            const startTime = e.start_time || "";
            const endTime = e.end_time || "";
            let duration = 0;
            if (startTime && endTime) {
              const [sh, sm] = startTime.split(":").map(Number);
              const [eh, em] = endTime.split(":").map(Number);
              if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
                duration = Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
              }
            }
            const status = getEntryStatus(e);
            const contactType = normalizeContactType(e);

            return {
              date: e.date || "",
              type: e.service_type || "",
              location: e.location || "",
              time: startTime && endTime ? `${startTime}-${endTime}` : "",
              duration: duration.toFixed(1),
              status,
              description: e.visit_narrative || e.session_narrative || "",
              notes: e.plan || "",
              // Drug testing specific
              testType: e.service_type?.replace("DST-", "") || "",
              testStatus: e.test_result === "Positive" ? "P" :
                         e.test_result === "Refusal" ? "R" :
                         contactType === "No Show" ? "NS" :
                         e.client_admitted_use === "Yes" ? "A" : "C",
              testResult: e.test_result || (e.client_admitted_use === "Yes" ? "Admission" : ""),
            };
          });

          setReportSessionLog((prev) => {
            const prevJson = JSON.stringify(prev || []);
            const nextJson = JSON.stringify(sessionLog || []);
            return prevJson === nextJson ? prev : sessionLog;
          });

          // Calculate totals
          const completedSessions = sessionLog.filter(s => s.status === "Completed");
          const totalHours = completedSessions.reduce((sum, s) => sum + parseFloat(s.duration || 0), 0);
          const noShows = sessionLog.filter(s => s.status === "No-Show").length;
          const cancellations = sessionLog.filter(s => s.status === "Cancelled").length;
          const rescheduled = sessionLog.filter(s => s.status === "Rescheduled").length;
          const endedEarly = sessionLog.filter(s => s.status === "Ended Early").length;

          // Get worker name from first entry
          const workerName = filteredEntries[0]?.worker_name || "";

          // Get goals from profile
          const goals = (p.goals || []).map((g) => (typeof g === "string" ? g : String(g?.text || "")));

          // Parse goal progress from case notes
          const goalProgress = parseGoalProgress(filteredEntries, goals);

          // Parse safety info
          const safetyInfo = parseSafetyInfo(filteredEntries);

          // Build family members list
          const familyMembers = [];
          if (p.raw?.Parent_1) familyMembers.push(p.raw.Parent_1);
          if (p.raw?.Parent_2) familyMembers.push(p.raw.Parent_2);
          if (p.raw?.Parent_3) familyMembers.push(p.raw.Parent_3);
          for (let i = 1; i <= 7; i++) {
            if (p.raw?.[`Child_${i}`]) familyMembers.push(p.raw[`Child_${i}`]);
          }

          // Build narratives from case notes
          const allNarratives = filteredEntries
            .filter(e => e.visit_narrative || e.session_narrative)
            .map(e => e.visit_narrative || e.session_narrative);

          const allInterventions = filteredEntries
            .filter(e => e.interventions)
            .map(e => `${e.date}: ${e.interventions}`);

          const allPlans = filteredEntries
            .filter(e => e.plan)
            .map(e => e.plan);

          // Build barriers from case notes (look for keywords)
          const barriersKeywords = ["barrier", "challenge", "difficult", "unable", "couldn't", "issue", "problem", "concern"];
          const barriers = allNarratives
            .filter(n => barriersKeywords.some(kw => n.toLowerCase().includes(kw)))
            .slice(0, 3);

          const barriersText = toParagraph(barriers, "");
          const interventionsText = toParagraph(allInterventions.slice(0, 5), "");
          const narrativesText = toParagraph(allNarratives.slice(0, 3), "");
          const plansText = toParagraph([...new Set(allPlans)].slice(0, 3), "");

          // Build form data
          let newFormData = {
            worker_name: workerName,
            report_month_year: `${monthNames[m]} ${y}`,
            family_name: p.caseName || "",
            mc_number: p.mcNumber || "",
            cfss: p.cfss || "",
            family_members: familyMembers.join(", "),
            persons_tested: familyMembers.filter((_, i) => i < 2).join(", "), // For drug testing
            reporting_period_from: filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].date : "",
            reporting_period_to: filteredEntries.length > 0 ? filteredEntries[0].date : "",
            hours_completed: totalHours.toFixed(1),
            hours_requested: "", // User should fill this
            no_shows: noShows.toString(),
            cancellations: cancellations.toString(),
            rescheduled: rescheduled.toString(),
            ended_early: endedEarly.toString(),
            // All goals from profile as a list
            goals_list: goals.filter(Boolean),
            // Goal progress — single unified narrative (populated by AI or manually)
            goals_progress_narrative: "",
            // Safety info
            ...safetyInfo,
            // Barriers
            barriers_addressed: barriersText
              ? `${providerPrefix} identified the following barriers during this reporting period: ${barriersText} The FLS addressed these barriers through targeted support and problem-solving with the family.`
              : `${providerPrefix} did not identify significant barriers during this reporting period.`,
            // Summary from interventions and plans
            family_progress_summary: interventionsText || narrativesText
              ? `${providerPrefix} supported family progress through ${interventionsText || narrativesText}.`
              : `${providerPrefix} supported the family through scheduled contacts and reinforced progress toward case plan goals.`,
            // Recommendations from plans
            recommendations: plansText
              ? `${providerPrefix} recommends the following next steps: ${plansText}`
              : `${providerPrefix} recommends continuing with the current service plan.`,
            // PTSV specific
            same_worker_yes: true,
            no_maltreatment_yes: true,
          };

          // Add drug testing specific data
          if (t === "drug_testing") {
            const drugData = parseDrugTestingData(filteredEntries);
            newFormData = { ...newFormData, ...drugData };
          }

          setReportFormData((prev) => {
            const prevJson = JSON.stringify(prev || {});
            const nextJson = JSON.stringify(newFormData || {});
            return prevJson === nextJson ? prev : newFormData;
          });

          if (filteredEntries.length > 0) {
            showToast(`Auto-populated from ${filteredEntries.length} case notes`);
          }

          setReportAutoPopulating(false);
        };

        // Trigger auto-populate (called from onChange handlers, not useEffect, to avoid hooks-in-conditional-function-call)
        const triggerAutoPopulate = (client, month, year, type) => {
          const profile = activeFamilyDirectoryOptions.find(p => p.key === client);
          if (!client || !profile) return;
          const key = `${client}|${month}|${year}|${type}|${profile.key || ""}`;
          if (reportAutoKeyRef.current === key) return;
          reportAutoKeyRef.current = key;
          autoPopulateFromNotes(profile, month, year, type);
        };

        // Generate AI content for narrative sections (enhanced)
        const generateAiContent = async () => {
          const filteredEntries = getFilteredEntries();
          if (filteredEntries.length === 0) {
            showToast("No entries to analyze");
            return;
          }

          setReportAiGenerating(true);
          try {
            const resp = await authFetch("/api/generateMonthlySummary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                templateType: reportFormType,
                caseName: selectedProfile?.caseName || "",
                mcNumber: selectedProfile?.mcNumber || "",
                cfss: selectedProfile?.cfss || "",
                workerName: reportFormData.worker_name || "",
                reportMonth: reportFormMonth,
                reportYear: reportFormYear,
                caseNotes: filteredEntries,
                profile: selectedProfile?.raw || {},
                goals: selectedProfile?.goals || [],
              }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Failed to generate");

            // Parse AI response and fill in narrative fields
            const summary = data.summary || "";

            // Extract sections from AI response
            const extractSection = (text, sectionName) => {
              const regex = new RegExp(`===== ${sectionName} =====\\s*([\\s\\S]*?)(?=====|$)`, 'i');
              const match = text.match(regex);
              return match ? match[1].trim() : "";
            };

            const newFormData = {
              ...reportFormData,
              // Family Support / PTSV fields — one unified goals narrative
              goals_progress_narrative: extractSection(summary, "PROGRESS TOWARD GOALS") || reportFormData.goals_progress_narrative,
              barriers_addressed: extractSection(summary, "BARRIERS IDENTIFIED AND ADDRESSED") || reportFormData.barriers_addressed,
              safety_assessment: extractSection(summary, "CHILD SAFETY ASSESSMENT") || reportFormData.safety_assessment,
              family_progress_summary: extractSection(summary, "SUMMARY") || extractSection(summary, "FAMILY'S PROGRESS") || reportFormData.family_progress_summary,
              recommendations: extractSection(summary, "RECOMMENDATIONS") || reportFormData.recommendations,
              // Drug testing fields
              abstinence_discussion: extractSection(summary, "Abstinence") || reportFormData.abstinence_discussion,
              client_encouragement: extractSection(summary, "Client Encouragement") || reportFormData.client_encouragement,
              continued_support: extractSection(summary, "Continued Support") || reportFormData.continued_support,
              outcome_of_contacts: extractSection(summary, "OUTCOME OF CONTACTS") || reportFormData.outcome_of_contacts,
            };

            setReportFormData(newFormData);
            showToast("AI content generated!");
          } catch (err) {
            showToast("Error: " + (err.message || "Failed to generate"));
          } finally {
            setReportAiGenerating(false);
          }
        };

        // Print the report
        const printReport = () => {
          const reportTitle = reportFormType === "family_support"
            ? "FAMILY SUPPORT SERVICE – MONTHLY SUMMARY REPORT"
            : reportFormType === "ptsv"
            ? "PARENTING TIME / SUPERVISED VISITATION – MONTHLY SUMMARY REPORT"
            : "DRUG TESTING SPECIMEN COLLECTION – MONTHLY CONTACT LOG / SUMMARY REPORT";

          const serviceLabel = reportFormType === "family_support" ? "Family Support"
            : reportFormType === "ptsv" ? "PTSV"
            : "Drug Testing";

          // Parse month/year from report_month_year (e.g. "December 2024")
          const rmyParts = String(reportFormData.report_month_year || "").split(/\s+/);
          const rmyMonth = rmyParts[0] || "";
          const rmyYear = rmyParts[1] || "";

          const fileName = buildReportFileName({
            familyName: reportFormData.family_name,
            mcNumber: reportFormData.mc_number,
            serviceTypes: serviceLabel,
            month: rmyMonth,
            year: rmyYear,
            reportType: "Monthly Summary",
          });

          const printWindow = window.open("", "_blank");
          printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${fileName || reportTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">
  <style>
    @page { size: letter; margin: 0.5in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      padding: 0.25in;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1E3A5F;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 14pt;
      font-weight: bold;
      color: #1E3A5F;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 9pt;
      color: #666;
    }
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .section-title {
      background: #1E3A5F;
      color: white;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 9pt;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .field-row {
      display: flex;
      border-bottom: 1px solid #ddd;
      padding: 4px 0;
    }
    .field-label {
      font-weight: bold;
      width: 180px;
      flex-shrink: 0;
      font-size: 9pt;
    }
    .field-value {
      flex: 1;
      font-size: 9pt;
    }
    .two-col { display: flex; gap: 20px; }
    .two-col > div { flex: 1; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 4px;
    }
    th {
      background: #f0f0f0;
      border: 1px solid #999;
      padding: 4px;
      text-align: left;
      font-weight: bold;
    }
    td {
      border: 1px solid #999;
      padding: 4px;
      vertical-align: top;
    }
    .narrative {
      border: 1px solid #ddd;
      padding: 8px;
      min-height: 60px;
      background: #fafafa;
      font-size: 9pt;
      white-space: pre-wrap;
    }
    .checkbox-row {
      display: flex;
      gap: 20px;
      padding: 6px 0;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .checkbox {
      width: 12px;
      height: 12px;
      border: 1px solid #000;
      display: inline-block;
    }
    .checkbox.checked::after {
      content: "✓";
      font-size: 10px;
      font-weight: bold;
    }
    .signature-section {
      margin-top: 20px;
      display: flex;
      gap: 40px;
    }
    .signature-line {
      flex: 1;
      border-top: 1px solid #000;
      padding-top: 4px;
      font-size: 9pt;
    }
    .signature-name {
      font-family: 'Dancing Script', cursive;
      font-size: 18pt;
      font-weight: 600;
      color: #1a365d;
    }
    .important-note {
      background: #FEF3C7;
      border: 1px solid #D97706;
      padding: 8px;
      font-size: 8pt;
      margin: 8px 0;
    }
    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
      font-size: 8pt;
      color: #666;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportTitle}</h1>
    <div class="subtitle">Due: 10th calendar day of the month following service</div>
  </div>

  ${reportFormType === "drug_testing" ? `
  <!-- Drug Testing Report -->
  <div class="section">
    <div class="section-title">Reporting Requirements</div>
    <div style="padding: 6px; background: #FEF3C7; border: 1px solid #D97706; font-size: 8pt;">
      No-shows, refusals, and admissions must be reported to CFSS by end of next business day.<br>
      Data must be entered through ToxAccess as directed by Redwood Toxicology Lab.
    </div>
  </div>

  <div class="section">
    <div class="section-title">Provider & Report Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Provider Agency:</span><span class="field-value">Epworth Village</span></div>
        <div class="field-row"><span class="field-label">Report Month/Year:</span><span class="field-value">${reportFormData.report_month_year || ""}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">Family Life Specialist:</span><span class="field-value">${reportFormData.worker_name || ""}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Client Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Family Name:</span><span class="field-value">${reportFormData.family_name || ""}</span></div>
        <div class="field-row"><span class="field-label">Person(s) Tested:</span><span class="field-value">${reportFormData.persons_tested || ""}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">MC#:</span><span class="field-value">${reportFormData.mc_number || ""}</span></div>
        <div class="field-row"><span class="field-label">CFSS Name/Email:</span><span class="field-value">${reportFormData.cfss || ""}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Specimen Collection Log</div>
    <table>
      <thead>
        <tr><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Result</th></tr>
      </thead>
      <tbody>
        ${reportSessionLog.map(s => `
          <tr>
            <td>${s.date}</td>
            <td>${s.time}</td>
            <td>${s.testType || s.type}</td>
            <td>${s.testStatus || s.status?.charAt(0) || ""}</td>
            <td>${s.testResult || ""}</td>
          </tr>
        `).join("")}
        ${reportSessionLog.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;">No entries</td></tr>' : ''}
      </tbody>
    </table>
    <div style="font-size: 7pt; color: #666; margin-top: 4px;">
      Type: U=Urine, SP=Sweat Patch, OS=Oral Swab, HF=Hair Follicle | Status: C=Collected, NS=No-Show, R=Refused, A=Admission
    </div>
  </div>

  <div class="section" style="page-break-before: always;">
    <div class="section-title">Contact Narratives</div>
    ${reportSessionLog.filter(s => s.description || s.notes).length === 0
      ? '<div style="padding: 8px; color: #999; text-align: center;">No contact narratives available</div>'
      : reportSessionLog.filter(s => s.description || s.notes).map(s => `
      <div class="case-note-entry" style="border: 1px solid #ddd; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="background: #f5f5f5; padding: 6px 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <span><strong>Date:</strong> ${s.date}</span>
          <span><strong>Time:</strong> ${s.time}</span>
          <span><strong>Type:</strong> ${s.testType || s.type}</span>
          <span><strong>Status:</strong> ${s.testStatus}</span>
          <span><strong>Result:</strong> ${s.testResult || "N/A"}</span>
        </div>
        <div style="padding: 10px; font-size: 9pt; line-height: 1.5; white-space: pre-wrap;">${s.description || s.notes || ""}</div>
      </div>
    `).join("")}
  </div>

  <div class="section">
    <div class="section-title">Collection Summary</div>
    <table>
      <thead><tr><th>Category</th><th>Count</th><th>Dates</th></tr></thead>
      <tbody>
        <tr><td>Successful Specimen Collections</td><td>${reportFormData.successful_collections || "0"}</td><td>${reportFormData.collection_dates || ""}</td></tr>
        <tr><td>No-Shows (client not present)</td><td>${reportFormData.no_shows || "0"}</td><td>${reportFormData.no_show_dates || ""}</td></tr>
        <tr><td>Refusals (client chose not to provide)</td><td>${reportFormData.refusals || "0"}</td><td>${reportFormData.refusal_dates || ""}</td></tr>
        <tr><td>Admissions (client self-disclosed use)</td><td>${reportFormData.admissions || "0"}</td><td>${reportFormData.admission_dates || ""}</td></tr>
        <tr><td>Cancelled En Route</td><td>${reportFormData.cancellations || "0"}</td><td>${reportFormData.cancellation_dates || ""}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Client Engagement Efforts</div>
    <div class="field-row" style="flex-direction: column;">
      <span class="field-label">Abstinence & Case Plan Goals Discussion:</span>
      <div class="narrative">${reportFormData.abstinence_discussion || ""}</div>
    </div>
    <div class="field-row" style="flex-direction: column; margin-top: 8px;">
      <span class="field-label">Client Encouragement & Positive Reinforcement:</span>
      <div class="narrative">${reportFormData.client_encouragement || ""}</div>
    </div>
    <div class="field-row" style="flex-direction: column; margin-top: 8px;">
      <span class="field-label">Continued Support Offered:</span>
      <div class="narrative">${reportFormData.continued_support || ""}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Outcome of Contacts</div>
    <div class="narrative">${reportFormData.outcome_of_contacts || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Family's Progress Summary</div>
    <div class="narrative">${reportFormData.family_progress_summary || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Recommendations</div>
    <div class="narrative">${reportFormData.recommendations || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Child Safety Assessment</div>
    <div class="field-row" style="flex-direction: column;">
      <span class="field-label">Actions taken by provider to continually assess child safety:</span>
      <div class="narrative">${reportFormData.safety_assessment || ""}</div>
    </div>
    <div class="checkbox-row" style="margin-top: 8px;">
      <span class="field-label">Safety Concerns:</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_none ? 'checked' : ''}"></span> None</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_cfss ? 'checked' : ''}"></span> Reported to CFSS</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_hotline ? 'checked' : ''}"></span> Reported to Hotline</span>
    </div>
    <div class="important-note">
      <strong>IMPORTANT:</strong> Any safety concerns must be reported IMMEDIATELY to the CFSS or the Child Abuse Hotline (1-800-652-1999)
    </div>
  </div>

  ` : reportFormType === "ptsv" ? `
  <!-- PTSV Report -->
  <div class="section">
    <div class="section-title">Provider & Report Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Provider Agency:</span><span class="field-value">Epworth Village</span></div>
        <div class="field-row"><span class="field-label">Report Month/Year:</span><span class="field-value">${reportFormData.report_month_year || ""}</span></div>
        <div class="field-row"><span class="field-label">PTSV Worker:</span><span class="field-value">${reportFormData.worker_name || ""}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">Months of Service:</span><span class="field-value">${reportFormData.months_of_service || ""}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Client Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Family Name:</span><span class="field-value">${reportFormData.family_name || ""}</span></div>
        <div class="field-row"><span class="field-label">Family Members:</span><span class="field-value">${reportFormData.family_members || ""}</span></div>
        <div class="field-row"><span class="field-label">Reporting Period:</span><span class="field-value">${reportFormData.reporting_period_from || ""} to ${reportFormData.reporting_period_to || ""}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">MC#:</span><span class="field-value">${reportFormData.mc_number || ""}</span></div>
        <div class="field-row"><span class="field-label">CFSS Name/Email:</span><span class="field-value">${reportFormData.cfss || ""}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Service Hours</div>
    <div class="two-col">
      <div class="field-row"><span class="field-label">Hours Requested This Month:</span><span class="field-value">${reportFormData.hours_requested || ""}</span></div>
      <div class="field-row"><span class="field-label">Hours Completed This Month:</span><span class="field-value">${reportFormData.hours_completed || ""}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Visitation Log Summary</div>
    <table>
      <thead>
        <tr><th>Date</th><th>Location</th><th>Duration</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${reportSessionLog.map(s => `
          <tr>
            <td>${s.date}</td>
            <td>${s.location}</td>
            <td>${s.duration} hrs</td>
            <td>${s.status}</td>
          </tr>
        `).join("")}
        ${reportSessionLog.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;">No entries</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <div class="section" style="page-break-before: always;">
    <div class="section-title">Visit Narratives</div>
    ${reportSessionLog.filter(s => s.description && s.status === "Completed").length === 0
      ? '<div style="padding: 8px; color: #999; text-align: center;">No visit narratives available</div>'
      : reportSessionLog.filter(s => s.description && s.status === "Completed").map(s => `
      <div class="case-note-entry" style="border: 1px solid #ddd; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="background: #f5f5f5; padding: 6px 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between;">
          <span><strong>Date:</strong> ${s.date}</span>
          <span><strong>Location:</strong> ${s.location}</span>
          <span><strong>Duration:</strong> ${s.duration} hrs</span>
        </div>
        <div style="padding: 10px; font-size: 9pt; line-height: 1.5; white-space: pre-wrap;">${s.description}</div>
      </div>
    `).join("")}
  </div>

  <div class="section">
    <div class="section-title">Visit Exceptions</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">No-Shows:</span><span class="field-value">${reportFormData.no_shows || "0"}</span></div>
        <div class="field-row"><span class="field-label">Cancellations:</span><span class="field-value">${reportFormData.cancellations || "0"}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">Rescheduled:</span><span class="field-value">${reportFormData.rescheduled || "0"}</span></div>
        <div class="field-row"><span class="field-label">Ended Early:</span><span class="field-value">${reportFormData.ended_early || "0"}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Progress Toward Goals</div>
    ${(reportFormData.goals_list || []).length > 0 ? `
    <div style="margin-bottom: 6px;">
      <span class="field-label" style="display: block; margin-bottom: 4px;">Goals:</span>
      <ol style="margin: 0 0 0 18px; padding: 0; font-size: 8.5pt; line-height: 1.5;">
        ${(reportFormData.goals_list || []).map(g => `<li>${g}</li>`).join("")}
      </ol>
    </div>
    ` : ""}
    <div class="narrative">${reportFormData.goals_progress_narrative || reportFormData.goal_1_progress || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Barriers Identified and Addressed</div>
    <div class="narrative">${reportFormData.barriers_addressed || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Child Safety Assessment Actions</div>
    <div class="narrative">${reportFormData.safety_assessment || ""}</div>
    <div class="checkbox-row" style="margin-top: 8px;">
      <span class="field-label">Safety Concerns:</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_none ? 'checked' : ''}"></span> None</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_cfss ? 'checked' : ''}"></span> Reported to CFSS</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_hotline ? 'checked' : ''}"></span> Reported to Hotline</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Performance Outcome Measures</div>
    <div class="checkbox-row">
      <span>Same worker maintained throughout service (Target: 80%)</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.same_worker_yes ? 'checked' : ''}"></span> Yes</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.same_worker_no ? 'checked' : ''}"></span> No</span>
    </div>
    <div class="checkbox-row">
      <span>No maltreatment during service (Target: 100%)</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.no_maltreatment_yes ? 'checked' : ''}"></span> Yes</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.no_maltreatment_no ? 'checked' : ''}"></span> No</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary and Recommendations</div>
    <div class="narrative">${reportFormData.family_progress_summary || ""}</div>
    <div class="narrative" style="margin-top: 8px;">${reportFormData.recommendations || ""}</div>
  </div>

  ` : `
  <!-- Family Support Report -->
  <div class="section">
    <div class="section-title">Provider & Report Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Provider Agency:</span><span class="field-value">Epworth Village</span></div>
        <div class="field-row"><span class="field-label">Report Month/Year:</span><span class="field-value">${reportFormData.report_month_year || ""}</span></div>
        <div class="field-row"><span class="field-label">FSW Name:</span><span class="field-value">${reportFormData.worker_name || ""}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">Months of Service:</span><span class="field-value">${reportFormData.months_of_service || ""}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Client Information</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Family Name:</span><span class="field-value">${reportFormData.family_name || ""}</span></div>
        <div class="field-row"><span class="field-label">Family Members:</span><span class="field-value">${reportFormData.family_members || ""}</span></div>
        <div class="field-row"><span class="field-label">Reporting Period:</span><span class="field-value">${reportFormData.reporting_period_from || ""} to ${reportFormData.reporting_period_to || ""}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">MC#:</span><span class="field-value">${reportFormData.mc_number || ""}</span></div>
        <div class="field-row"><span class="field-label">CFSS Name/Email:</span><span class="field-value">${reportFormData.cfss || ""}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Service Hours</div>
    <div class="two-col">
      <div class="field-row"><span class="field-label">Hours Requested This Month:</span><span class="field-value">${reportFormData.hours_requested || ""}</span></div>
      <div class="field-row"><span class="field-label">Hours Completed This Month:</span><span class="field-value">${reportFormData.hours_completed || ""}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Session Log Summary</div>
    <table>
      <thead>
        <tr><th>Date</th><th>Type</th><th>Duration</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${reportSessionLog.map(s => `
          <tr>
            <td>${s.date}</td>
            <td>${s.type}</td>
            <td>${s.duration} hrs</td>
            <td>${s.status}</td>
          </tr>
        `).join("")}
        ${reportSessionLog.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;">No entries</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <div class="section" style="page-break-before: always;">
    <div class="section-title">Case Note Narratives</div>
    ${reportSessionLog.filter(s => s.description && s.status === "Completed").length === 0
      ? '<div style="padding: 8px; color: #999; text-align: center;">No case note narratives available</div>'
      : reportSessionLog.filter(s => s.description && s.status === "Completed").map(s => `
      <div class="case-note-entry" style="border: 1px solid #ddd; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="background: #f5f5f5; padding: 6px 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between;">
          <span><strong>Date:</strong> ${s.date}</span>
          <span><strong>Service:</strong> ${s.type}</span>
          <span><strong>Duration:</strong> ${s.duration} hrs</span>
        </div>
        <div style="padding: 10px; font-size: 9pt; line-height: 1.5; white-space: pre-wrap;">${s.description}</div>
      </div>
    `).join("")}
  </div>

  <div class="section">
    <div class="section-title">Session Exceptions</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">No-Shows:</span><span class="field-value">${reportFormData.no_shows || "0"}</span></div>
        <div class="field-row"><span class="field-label">Cancellations:</span><span class="field-value">${reportFormData.cancellations || "0"}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">Rescheduled:</span><span class="field-value">${reportFormData.rescheduled || "0"}</span></div>
        <div class="field-row"><span class="field-label">Ended Early:</span><span class="field-value">${reportFormData.ended_early || "0"}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Progress Toward Goals</div>
    ${(reportFormData.goals_list || []).length > 0 ? `
    <div style="margin-bottom: 6px;">
      <span class="field-label" style="display: block; margin-bottom: 4px;">Goals:</span>
      <ol style="margin: 0 0 0 18px; padding: 0; font-size: 8.5pt; line-height: 1.5;">
        ${(reportFormData.goals_list || []).map(g => `<li>${g}</li>`).join("")}
      </ol>
    </div>
    ` : ""}
    <div class="narrative">${reportFormData.goals_progress_narrative || reportFormData.goal_1_progress || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Barriers Identified and Addressed</div>
    <div class="narrative">${reportFormData.barriers_addressed || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Child Safety Assessment Actions</div>
    <div class="narrative">${reportFormData.safety_assessment || ""}</div>
    <div class="checkbox-row" style="margin-top: 8px;">
      <span class="field-label">Safety Concerns:</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_none ? 'checked' : ''}"></span> None</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_cfss ? 'checked' : ''}"></span> Reported to CFSS</span>
      <span class="checkbox-item"><span class="checkbox ${reportFormData.safety_hotline ? 'checked' : ''}"></span> Reported to Hotline</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary of Family's Progress</div>
    <div class="narrative">${reportFormData.family_progress_summary || ""}</div>
  </div>

  <div class="section">
    <div class="section-title">Recommendations</div>
    <div class="narrative">${reportFormData.recommendations || ""}</div>
  </div>
  `}

  <div class="signature-section">
    <div class="signature-line"><span class="signature-name">${reportFormData.worker_name || ""}</span><br><span style="font-size: 8pt; color: #666;">${reportFormType === "drug_testing" ? "Family Life Specialist" : reportFormType === "ptsv" ? "PTSV Worker" : "Family Support Worker"} Signature</span></div>
    <div class="signature-line">${new Date().toLocaleDateString()}<br><span style="font-size: 8pt; color: #666;">Date</span></div>
  </div>
  <div class="signature-section" style="margin-top: 16px;">
    <div class="signature-line"><span class="signature-name">Brandon Hinrichs</span><br><span style="font-size: 8pt; color: #666;">IHS Director</span></div>
    <div class="signature-line">${new Date().toLocaleDateString()}<br><span style="font-size: 8pt; color: #666;">Date</span></div>
  </div>

  <div class="footer">
    Epworth Village Family Resources | Confidential Document
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #1E3A5F; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
      Print Report
    </button>
  </div>
</body>
</html>
          `);
          printWindow.document.close();
          setTimeout(() => printWindow.print(), 500);
        };

        // Update a field in form data
        const updateField = (field, value) => {
          setReportFormData(prev => ({ ...prev, [field]: value }));
        };

        // Render input field helper - using inline JSX to avoid component recreation
        const renderReportInput = (label, field, type = "text", placeholder = "", rows = 1) => (
          <div className="mb-3" key={field}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
            {rows > 1 ? (
              <textarea
                value={reportFormData[field] || ""}
                onChange={(e) => updateField(field, e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            ) : (
              <input
                type={type}
                value={reportFormData[field] || ""}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            )}
          </div>
        );

        // Render checkbox helper - using inline JSX to avoid component recreation
        const renderReportCheckbox = (label, field) => (
          <label className="flex items-center gap-2 cursor-pointer" key={field}>
            <input
              type="checkbox"
              checked={reportFormData[field] || false}
              onChange={(e) => updateField(field, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        );

        return (
          <div className="w-full space-y-6 mb-20">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <LucideIcon name="FileText" className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Monthly Summary Reports</h2>
                    <p className="text-gray-500 text-sm">Create professional monthly reports matching your templates</p>
                  </div>
                </div>
              </div>

              {/* Report Type & Client Selection */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
                  <select
                    value={reportFormType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReportFormType(val);
                      setReportFormData({});
                      setReportSessionLog([]);
                      triggerAutoPopulate(reportFormClient, reportFormMonth, reportFormYear, val);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="family_support">Family Support (OHFS/IHFS)</option>
                    <option value="ptsv">Supervised Visitation (PTSV)</option>
                    <option value="drug_testing">Drug Testing (DST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Client</label>
                  <select
                    value={reportFormClient}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReportFormClient(val);
                      triggerAutoPopulate(val, reportFormMonth, reportFormYear, reportFormType);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a client...</option>
                    {activeFamilyDirectoryOptions.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.caseName || "Unknown"} {p.mcNumber ? `(${p.mcNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Month</label>
                  <select
                    value={reportFormMonth}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setReportFormMonth(val);
                      triggerAutoPopulate(reportFormClient, val, reportFormYear, reportFormType);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {monthNames.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                  <select
                    value={reportFormYear}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setReportFormYear(val);
                      triggerAutoPopulate(reportFormClient, reportFormMonth, val, reportFormType);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[2023, 2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                <Button
                  variant="secondary"
                  iconName="Download"
                  onClick={autoPopulateFromNotes}
                  disabled={!reportFormClient || reportAutoPopulating}
                >
                  {reportAutoPopulating ? "Loading..." : "Auto-Populate from Notes"}
                </Button>
                <Button
                  variant="secondary"
                  iconName="Sparkles"
                  onClick={generateAiContent}
                  disabled={!reportFormClient || reportAiGenerating}
                >
                  {reportAiGenerating ? "Generating..." : "AI Generate Narratives"}
                </Button>
                <Button
                  variant="secondary"
                  iconName="RotateCcw"
                  onClick={() => {
                    setReportFormData({});
                    setReportSessionLog([]);
                  }}
                >
                  Clear Form
                </Button>
                <div className="flex-1"></div>
                <Button
                  variant="primary"
                  iconName="Printer"
                  onClick={printReport}
                >
                  Print Report
                </Button>
              </div>
            </div>

            {/* Batch Export Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <LucideIcon name="PackageOpen" className="w-6 h-6 text-indigo-600 mr-3" />
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Batch Export</h3>
                  <p className="text-gray-500 text-sm">Export all case notes or monthly reports for every client as a ZIP of printable files</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={batchExportCaseNotes}
                  disabled={batchExportLoading || batchReportLoading}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <LucideIcon name="FileText" className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">{batchExportLoading ? "Exporting..." : "Batch Export Case Notes"}</div>
                    <div className="text-xs text-blue-200">All clients, grouped by service type</div>
                  </div>
                </button>
                <button
                  onClick={batchExportMonthlyReports}
                  disabled={batchExportLoading || batchReportLoading}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <LucideIcon name="FolderDown" className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">{batchReportLoading ? "Exporting..." : "Batch Export Monthly Reports"}</div>
                    <div className="text-xs text-indigo-200">All clients, per service, per month</div>
                  </div>
                </button>
              </div>
              {(batchExportProgress || batchReportProgress) && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <LucideIcon name="Loader2" className="w-4 h-4 animate-spin" />
                  {batchExportProgress || batchReportProgress}
                </div>
              )}
              <div className="mt-3 text-xs text-gray-400">
                Files named: lastname.firstname.MasterCase.service.date(monthyear).pdf
              </div>
            </div>

            {/* Report Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <LucideIcon name="ClipboardList" className="w-5 h-5 mr-2 text-gray-600" />
                {reportFormType === "family_support" ? "Family Support Service Monthly Report" :
                 reportFormType === "ptsv" ? "PTSV Monthly Summary Report" :
                 "Drug Testing Monthly Contact Log"}
              </h3>

              {/* Provider & Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 border-b pb-1">Provider Information</h4>
                  {renderReportInput("Report Month/Year", "report_month_year", "text", "December 2024")}
                  {renderReportInput(reportFormType === "drug_testing" ? "Family Life Specialist" : reportFormType === "ptsv" ? "PTSV Worker" : "FSW Name", "worker_name")}
                  {reportFormType !== "drug_testing" && renderReportInput("Months of Service", "months_of_service")}
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 border-b pb-1">Client Information</h4>
                  {renderReportInput("Family Name", "family_name")}
                  {renderReportInput("MC#", "mc_number")}
                  {renderReportInput("CFSS Name/Email", "cfss")}
                  {reportFormType === "drug_testing"
                    ? renderReportInput("Person(s) Tested", "persons_tested")
                    : renderReportInput("Family Members", "family_members")}
                </div>
              </div>

              {/* Service Hours / Reporting Period */}
              {reportFormType !== "drug_testing" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  {renderReportInput("Period From", "reporting_period_from", "date")}
                  {renderReportInput("Period To", "reporting_period_to", "date")}
                  {renderReportInput("Hours Requested", "hours_requested")}
                  {renderReportInput("Hours Completed", "hours_completed")}
                </div>
              )}

              {/* Session/Visit/Collection Log */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 border-b pb-1 mb-3">
                  {reportFormType === "drug_testing" ? "Specimen Collection Log" :
                   reportFormType === "ptsv" ? "Visitation Log" : "Session Log"}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Date</th>
                        {reportFormType === "drug_testing" ? (
                          <>
                            <th className="border p-2 text-left">Time</th>
                            <th className="border p-2 text-left">Type</th>
                            <th className="border p-2 text-left">Status</th>
                            <th className="border p-2 text-left">Result</th>
                            <th className="border p-2 text-left">Notes</th>
                          </>
                        ) : (
                          <>
                            <th className="border p-2 text-left">{reportFormType === "ptsv" ? "Location" : "Type"}</th>
                            <th className="border p-2 text-left">Duration</th>
                            <th className="border p-2 text-left">Status</th>
                            <th className="border p-2 text-left">Description</th>
                          </>
                        )}
                        <th className="border p-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportSessionLog.map((session, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border p-2">
                            <input
                              type="date"
                              value={session.date}
                              onChange={(e) => {
                                const newLog = [...reportSessionLog];
                                newLog[idx].date = e.target.value;
                                setReportSessionLog(newLog);
                              }}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </td>
                          {reportFormType === "drug_testing" ? (
                            <>
                              <td className="border p-2">
                                <input
                                  type="text"
                                  value={session.time}
                                  onChange={(e) => {
                                    const newLog = [...reportSessionLog];
                                    newLog[idx].time = e.target.value;
                                    setReportSessionLog(newLog);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  placeholder="9:00-9:30"
                                />
                              </td>
                              <td className="border p-2">
                                <select
                                  value={session.testType}
                                  onChange={(e) => {
                                    const newLog = [...reportSessionLog];
                                    newLog[idx].testType = e.target.value;
                                    setReportSessionLog(newLog);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                >
                                  <option value="U">U (Urine)</option>
                                  <option value="SP">SP (Sweat Patch)</option>
                                  <option value="OS">OS (Oral Swab)</option>
                                  <option value="HF">HF (Hair Follicle)</option>
                                </select>
                              </td>
                              <td className="border p-2">
                                <select
                                  value={session.testStatus}
                                  onChange={(e) => {
                                    const newLog = [...reportSessionLog];
                                    newLog[idx].testStatus = e.target.value;
                                    setReportSessionLog(newLog);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                >
                                  <option value="C">C (Collected)</option>
                                  <option value="NS">NS (No-Show)</option>
                                  <option value="R">R (Refused)</option>
                                  <option value="A">A (Admission)</option>
                                </select>
                              </td>
                              <td className="border p-2">
                                <select
                                  value={session.testResult || ""}
                                  onChange={(e) => {
                                    const newLog = [...reportSessionLog];
                                    newLog[idx].testResult = e.target.value;
                                    setReportSessionLog(newLog);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                >
                                  <option value="">--</option>
                                  <option value="Negative">Negative</option>
                                  <option value="Positive">Positive</option>
                                  <option value="Refusal">Refusal</option>
                                  <option value="Admission">Admission</option>
                                  <option value="Pending">Pending</option>
                                </select>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border p-2">
                                <input
                                  type="text"
                                  value={reportFormType === "ptsv" ? session.location : session.type}
                                  onChange={(e) => {
                                    const newLog = [...reportSessionLog];
                                    if (reportFormType === "ptsv") {
                                      newLog[idx].location = e.target.value;
                                    } else {
                                      newLog[idx].type = e.target.value;
                                    }
                                    setReportSessionLog(newLog);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <input
                                  type="text"
                                  value={session.duration}
                                  onChange={(e) => {
                                    const newLog = [...reportSessionLog];
                                    newLog[idx].duration = e.target.value;
                                    setReportSessionLog(newLog);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  placeholder="1.5"
                                />
                              </td>
                              <td className="border p-2">
                                <select
                                  value={session.status}
                                  onChange={(e) => {
                                    const newLog = [...reportSessionLog];
                                    newLog[idx].status = e.target.value;
                                    setReportSessionLog(newLog);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                >
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                  <option value="No-Show">No-Show</option>
                                  <option value="Rescheduled">Rescheduled</option>
                                </select>
                              </td>
                            </>
                          )}
                          <td className="border p-2">
                            <textarea
                              value={session.description || session.notes || ""}
                              onChange={(e) => {
                                const newLog = [...reportSessionLog];
                                newLog[idx].description = e.target.value;
                                setReportSessionLog(newLog);
                              }}
                              className="w-full px-2 py-1 border rounded text-sm min-h-[60px] resize-y"
                              rows={2}
                            />
                          </td>
                          <td className="border p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setReportSessionLog(reportSessionLog.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <LucideIcon name="Trash2" className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  variant="secondary"
                  iconName="Plus"
                  className="mt-2"
                  onClick={() => setReportSessionLog([...reportSessionLog, {
                    date: "",
                    type: "",
                    location: "",
                    time: "",
                    duration: "",
                    status: "Completed",
                    description: "",
                    testType: "U",
                    testStatus: "C",
                    testResult: "",
                  }])}
                >
                  Add Row
                </Button>
              </div>

              {/* Exceptions Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                {reportFormType === "drug_testing" ? (
                  <>
                    {renderReportInput("Successful Collections", "successful_collections")}
                    {renderReportInput("No-Shows", "no_shows")}
                    {renderReportInput("Refusals", "refusals")}
                    {renderReportInput("Admissions", "admissions")}
                  </>
                ) : (
                  <>
                    {renderReportInput("No-Shows", "no_shows")}
                    {renderReportInput("Cancellations", "cancellations")}
                    {renderReportInput("Rescheduled", "rescheduled")}
                    {renderReportInput("Ended Early", "ended_early")}
                  </>
                )}
              </div>

              {/* Goals Progress (Family Support & PTSV) */}
              {reportFormType !== "drug_testing" && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 border-b pb-1 mb-3">Progress Toward Goals</h4>
                  {/* Goals list from profile */}
                  {(reportFormData.goals_list || []).length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Goals from Profile</p>
                      <ol className="list-decimal list-inside space-y-1">
                        {(reportFormData.goals_list || []).map((g, i) => (
                          <li key={i} className="text-sm text-gray-800">{g}</li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic mb-3">No goals found in profile. Select a family to load goals.</p>
                  )}
                  {renderReportInput("Overall Progress Narrative", "goals_progress_narrative", "text", "Summarize overall progress toward all goals during this reporting period...", 6)}
                </div>
              )}

              {/* Drug Testing Specific Sections */}
              {reportFormType === "drug_testing" && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 border-b pb-1 mb-3">Client Engagement Efforts</h4>
                  {renderReportInput("Abstinence & Case Plan Goals Discussion", "abstinence_discussion", "text", "Document discussion about importance of maintaining abstinence to meet case plan goals...", 3)}
                  {renderReportInput("Client Encouragement & Positive Reinforcement", "client_encouragement", "text", "Document encouragement and positive reinforcement provided...", 3)}
                  {renderReportInput("Continued Support Offered", "continued_support", "text", "Document support offered to the client...", 3)}
                </div>
              )}

              {/* Barriers (Family Support & PTSV) */}
              {reportFormType !== "drug_testing" && renderReportInput("Barriers Identified and Addressed", "barriers_addressed", "text", "Document any barriers and how they were addressed...", 3)}

              {/* Outcome of Contacts (Drug Testing) */}
              {reportFormType === "drug_testing" && renderReportInput("Outcome of Contacts", "outcome_of_contacts", "text", "Description of each contact outcome and conversation...", 4)}

              {/* Safety Assessment */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 border-b pb-1 mb-3">Child Safety Assessment</h4>
                {renderReportInput("Actions taken to assess child safety", "safety_assessment", "text", "Document actions taken by provider to continually assess child safety...", 3)}
                <div className="flex flex-wrap gap-4 mt-3">
                  <span className="font-semibold text-gray-700">Safety Concerns:</span>
                  {renderReportCheckbox("None", "safety_none")}
                  {renderReportCheckbox("Reported to CFSS", "safety_cfss")}
                  {renderReportCheckbox("Reported to Hotline", "safety_hotline")}
                </div>
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  <strong>IMPORTANT:</strong> Any safety concerns must be reported IMMEDIATELY to the CFSS or the Child Abuse Hotline (1-800-652-1999)
                </div>
              </div>

              {/* Performance Outcomes (PTSV only) */}
              {reportFormType === "ptsv" && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 border-b pb-1 mb-3">Performance Outcome Measures</h4>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <span className="text-sm text-gray-700">Same worker maintained throughout service (Target: 80%)</span>
                      <div className="flex gap-4 mt-1">
                        {renderReportCheckbox("Yes", "same_worker_yes")}
                        {renderReportCheckbox("No", "same_worker_no")}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-700">No maltreatment during service (Target: 100%)</span>
                      <div className="flex gap-4 mt-1">
                        {renderReportCheckbox("Yes", "no_maltreatment_yes")}
                        {renderReportCheckbox("No", "no_maltreatment_no")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary & Recommendations */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 border-b pb-1 mb-3">
                  {reportFormType === "ptsv" ? "Summary and Recommendations" : "Summary & Recommendations"}
                </h4>
                {renderReportInput("Family's Progress Summary", "family_progress_summary", "text", "Summarize the family's overall progress this month...", 4)}
                {renderReportInput("Recommendations", "recommendations", "text", "Provide recommendations for continued services...", 3)}
              </div>

              {/* Print Button at Bottom */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="primary"
                  iconName="Printer"
                  onClick={printReport}
                  className="px-6"
                >
                  Print Report
                </Button>
              </div>
            </div>
          </div>
        );
      };

	        if (!isFirebaseConfigured(firebaseConfig)) {
	          return (
	            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
	              <div className="text-center p-6 max-w-xl">
	                <div className="flex justify-center mb-5">
	                  <img src={EPWORTH_LOGO_SRC} alt="Epworth Family Resources" className="h-14 w-auto object-contain" />
	                </div>
	                <h2 className="text-xl font-bold text-gray-800 mb-2">Configuration Required</h2>
	                <p className="text-sm">
	                  Update the <code className="font-mono">firebaseConfig</code> object in <code className="font-mono">Case Note.html</code> with your project
	                  details.
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Note: Firebase/Clipboard features may not work reliably on <span className="font-mono">file://</span> URLs; serving via a local web server is recommended.
                </p>
              </div>
            </div>
          );
        }

	        if (!authReady || !user) {
	          return (
	            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
	              <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 w-full max-w-md">
	                <div className="flex justify-center mb-4">
	                  <img src={EPWORTH_LOGO_SRC} alt="Epworth Family Resources" className="h-12 w-auto object-contain" />
	                </div>
	                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-navy)] mr-3"></div>
	                  <div className="font-medium">Signing in…</div>
	                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Sign in with your approved Epworth Google account.
                </div>

                {/* Google Sign-In */}
                <Button variant="secondary" onClick={linkOrSignInWithGooglePopup} iconName="LogIn" className="w-full">
                  Sign in with Google
                </Button>

                {authError && <div className="mt-4 text-sm text-red-600 break-words">{authError}</div>}
	              </div>
	            </div>
	          );
	        }

        return (
	          <div className="min-h-screen bg-transparent font-sans text-gray-900 pb-4 md:pb-20" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}>
	            <div id="app-ui">
	            <nav className="bg-white/90 backdrop-blur shadow-sm sticky top-0 z-40 border-b border-gray-200" style={{ paddingTop: "env(safe-area-inset-top)" }}>
	              <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
	                <div className="flex justify-between h-14 sm:h-16">
	                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
	                    {/* Hamburger button - mobile only */}
	                    <button
	                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
	                      className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
	                      aria-label="Open navigation menu"
	                    >
	                      <LucideIcon name={mobileMenuOpen ? "X" : "Menu"} className="w-6 h-6 text-gray-700" />
	                    </button>
	                    <div className="mr-1 sm:mr-3 flex items-center flex-shrink-0">
	                      <img src={EPWORTH_LOGO_SRC} alt="Epworth Family Resources" className="h-8 sm:h-10 w-auto object-contain" />
	                    </div>
	                    <div className="min-w-0">
	                      <h1
	                        className="text-base sm:text-xl font-extrabold leading-tight text-[var(--brand-navy)] truncate"
	                        style={{ fontFamily: "Merriweather, ui-serif, Georgia, serif" }}
	                      >
	                        <span className="hidden sm:inline">Epworth Family Resources Notes</span>
	                        <span className="sm:hidden">Epworth Notes</span>
	                      </h1>
	                      <p className="text-xs text-gray-500 hidden sm:block">Case notes, profiles, and export</p>
	                    </div>
	                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {user?.isAnonymous ? (
                      <Button variant="secondary" onClick={linkOrSignInWithGooglePopup} iconName="Link2" className="text-sm">
                        <span className="hidden sm:inline">Link Account</span>
                        <span className="sm:hidden">Link</span>
                      </Button>
                    ) : (
                      <div className="text-xs text-gray-500 hidden sm:block">{user?.email || "Signed in"}</div>
                    )}
                    <Button variant="ghost" onClick={signOut} iconName="LogOut" className="text-sm" title="Sign out">
                      <span className="hidden sm:inline">Sign out</span>
                    </Button>
                  </div>
                </div>
              </div>
            </nav>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-50">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/50 mobile-drawer-backdrop"
                  onClick={() => setMobileMenuOpen(false)}
                />
                {/* Drawer */}
                <div className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl mobile-drawer-panel flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <img src={EPWORTH_LOGO_SRC} alt="Epworth" className="h-8 w-auto object-contain" />
                      <span className="text-sm font-bold text-[var(--brand-navy)]">Navigation</span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Close navigation menu"
                    >
                      <LucideIcon name="X" className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Navigation Items */}
                  <div className="flex-1 overflow-y-auto py-2" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                    {[
                      { key: "form", icon: "Edit2", label: "New Entry" },
                      { key: "table", icon: "Table", label: "Note History" },
                      { key: "contacts", icon: "Phone", label: "Contacts" },
                      ...(isAdmin ? [
                        { key: "bulkEdit", icon: "Edit3", label: "Bulk Edit" },
                        { key: "goals", icon: "Users", label: "Client Profiles" },
                        { key: "reports", icon: "FileText", label: "Monthly Reports" },
                        { key: "audit", icon: "History", label: "Audit Log" },
                        { key: "docsReports", icon: "FileText", label: "Docs & Reports" },
                        { key: "admin", icon: "Settings", label: "Admin Panel" },
                      ] : []),
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveTab(item.key);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          activeTab === item.key
                            ? "bg-blue-50 text-[var(--brand-navy)] font-semibold border-l-4 border-[var(--brand-navy)]"
                            : "text-gray-700 hover:bg-gray-50 border-l-4 border-transparent"
                        }`}
                      >
                        <LucideIcon name={item.icon} className={`w-5 h-5 flex-shrink-0 ${activeTab === item.key ? "text-[var(--brand-navy)]" : "text-gray-400"}`} />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    ))}

                    {/* Divider + User Info */}
                    <div className="border-t border-gray-200 mt-3 pt-3 px-4">
                      <div className="text-xs text-gray-500 truncate">{user?.email || "Signed in"}</div>
                      {isAdmin && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          <LucideIcon name="Shield" className="w-3 h-3" />
                          Admin
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {authError && (
              <div className="bg-red-50 border-b border-red-200 text-red-700">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm break-words">
                  {authError}
                </div>
              </div>
            )}

		            {saveError && (
		              <div className="bg-red-50 border-b border-red-200 text-red-700">
			                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm break-words flex items-start justify-between gap-3">
			                  <div>
			                    Save failed: {saveError}
			                    {!navigator.onLine ? " (Browser appears offline)" : ""}
			                  </div>
			                  <div className="flex items-center gap-2 flex-shrink-0">
			                    {lastDraftRef.current ? (
			                      <button
			                        type="button"
			                        onClick={() => {
			                          setFormData(lastDraftRef.current || {});
			                          setActiveTab("form");
			                          setSaveError("");
			                        }}
			                        className="px-3 py-1 rounded-lg border border-red-200 bg-white text-red-700 font-semibold hover:bg-red-50"
			                      >
			                        Restore last entry
			                      </button>
			                    ) : null}
			                    <button
			                      type="button"
			                      onClick={() => setSaveError("")}
			                      className="px-3 py-1 rounded-lg border border-red-200 bg-white text-red-700 font-semibold hover:bg-red-50"
			                    >
			                      Dismiss
			                    </button>
			                  </div>
			                </div>
		              </div>
		            )}

	            {saveWarning && (
	              <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-900">
		                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm break-words">{saveWarning}</div>
	              </div>
	            )}

			            <main className={`${activeTab === "table" || activeTab === "bulkEdit" || activeTab === "goals" || activeTab === "contacts" || activeTab === "admin" || activeTab === "reports" || activeTab === "audit" || activeTab === "docsReports" ? "w-full" : "max-w-6xl mx-auto"} px-4 sm:px-6 lg:px-8 py-6`}>
	              {activeTab === "form" && FormView()}
	              {activeTab === "table" &&
		              (loadingEntries && !entries.length ? (
	                <div className="min-h-[50vh] flex items-center justify-center text-gray-500">
	                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-navy)] mr-2"></div>
	                  Loading history…
	                </div>
		              ) : (
		                TableView()
		              ))}
	              {activeTab === "bulkEdit" && isAdmin && BulkEditView()}
	              {activeTab === "goals" && isAdmin &&
	                (loadingDirectory ? (
                  <div className="min-h-[50vh] flex items-center justify-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-navy)] mr-2"></div>
                    Loading client profiles…
                  </div>
	                ) : (
	                  GoalsView()
	                ))}
	              {activeTab === "contacts" && isAdmin && <NonBillableContactsView />}
	              {activeTab === "admin" && isAdmin && AdminView()}
	              {activeTab === "reports" && isAdmin && MonthlyReportsView()}
	              {activeTab === "audit" && isAdmin && AuditLogView()}
	              {activeTab === "docsReports" && isAdmin && <DocsReportsView />}
		            </main>

	            {saveToast && (
	              <div className="fixed left-1/2 -translate-x-1/2 bottom-8 md:bottom-24 z-[60]">
	                <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold">
	                  {saveToast}
	                </div>
	              </div>
	            )}

		            <div className="hidden md:block fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 pb-[env(safe-area-inset-bottom)] shadow-lg z-50">
		              <div className="max-w-6xl mx-auto flex items-center justify-around h-16 px-4 lg:px-8">
	                {[
	                  { key: "form", icon: "Edit2", label: "Entry" },
	                  { key: "table", icon: "Table", label: "History" },
	                  { key: "contacts", icon: "Phone", label: "Contacts" },
	                  ...(isAdmin ? [
	                    { key: "bulkEdit", icon: "Edit3", label: "Bulk Edit" },
	                    { key: "goals", icon: "Users", label: "Profiles" },
	                    { key: "reports", icon: "FileText", label: "Reports" },
	                    { key: "audit", icon: "History", label: "Audit" },
	                    { key: "docsReports", icon: "FileText", label: "Docs" },
	                    { key: "admin", icon: "Settings", label: "Admin" },
	                  ] : []),
	                ].map((item) => (
	                  <button
	                    key={item.key}
	                    onClick={() => setActiveTab(item.key)}
	                    className={`relative flex flex-col items-center justify-center h-full px-3 py-1 gap-0.5 transition-colors ${
	                      activeTab === item.key
	                        ? "text-[var(--brand-navy)]"
	                        : "text-gray-400 hover:text-gray-600"
	                    }`}
	                  >
	                    {activeTab === item.key && (
	                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--brand-navy)] rounded-b" />
	                    )}
	                    <LucideIcon name={item.icon} className="w-5 h-5" />
	                    <span className={`text-[11px] leading-tight ${activeTab === item.key ? "font-semibold" : "font-medium"}`}>{item.label}</span>
	                  </button>
	                ))}
              </div>
            </div>

	            <div className="hidden fixed bottom-8 right-8 space-y-3">
	              {isAdmin && activeTab !== "goals" && (
	                <button
	                  onClick={() => setActiveTab("goals")}
                  className="flex items-center justify-center w-12 h-12 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all"
                  title="Client Profiles"
                >
                  <LucideIcon name="Users" className="w-6 h-6" />
                </button>
              )}
              {activeTab !== "form" && (
                <button
                  onClick={() => setActiveTab("form")}
                  className="flex items-center justify-center w-12 h-12 bg-[var(--brand-navy)] text-white rounded-full shadow-lg hover:bg-[var(--brand-navy-700)] transition-all"
                  title="Add Entry"
                >
                  <LucideIcon name="Plus" className="w-6 h-6" />
                </button>
              )}
              {activeTab !== "table" && (
                <button
                  onClick={() => setActiveTab("table")}
                  className="flex items-center justify-center w-12 h-12 bg-white text-gray-700 border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-all"
                  title="View Table"
                >
                  <LucideIcon name="Table" className="w-6 h-6" />
                </button>
	              )}
	            </div>
            </div>

            <div className="print-root" dangerouslySetInnerHTML={{ __html: sanitizeHtml(printHtml) }} />
          </div>
        );
      }


export default App;
