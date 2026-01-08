import { useState } from "react";
import { Database, Key, Shield, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActivateLicense, useValidateLicense } from "@/lib/hooks";

interface LicenseScreenProps {
  onLicenseActivated: () => void;
}

export function LicenseScreen({ onLicenseActivated }: LicenseScreenProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");

  const validateLicense = useValidateLicense();
  const activateLicense = useActivateLicense();

  const isLoading = validateLicense.isPending || activateLicense.isPending;

  const handleValidate = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    setError(null);
    setValidationStatus("validating");

    try {
      const result = await validateLicense.mutateAsync(licenseKey.trim());
      
      if (result.valid) {
        setValidationStatus("valid");
      } else {
        setValidationStatus("invalid");
        setError(result.error || "Invalid license key");
      }
    } catch (err) {
      setValidationStatus("invalid");
      setError(err instanceof Error ? err.message : "Failed to validate license");
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    setError(null);

    try {
      const result = await activateLicense.mutateAsync(licenseKey.trim());
      
      if (result.success) {
        onLicenseActivated();
      } else {
        setError(result.error || "Failed to activate license");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate license");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationStatus === "valid") {
      await handleActivate();
    } else {
      await handleValidate();
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background overflow-hidden">
      {/* Draggable title bar region */}
      <div 
        data-tauri-drag-region 
        className="h-7 w-full shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      
      <div className="flex flex-1">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative overflow-hidden">
          {/* Gradient background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-semibold text-foreground">QueryStudio</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold text-foreground mb-4 leading-tight"
            >
              Activate your
              <br />
              <span className="text-primary">license</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-10 max-w-md"
            >
              Enter your license key to unlock QueryStudio and start exploring your databases.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="flex items-center gap-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Shield className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Secure Activation</p>
                  <p className="text-xs text-muted-foreground">Your license is tied to this device</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="flex items-center gap-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Key className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">One-time Setup</p>
                  <p className="text-xs text-muted-foreground">Enter your key once and you're done</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Right side - License Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {/* Mobile logo - only shown on smaller screens */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-semibold text-foreground">QueryStudio</span>
            </div>
            
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/5">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Enter License Key
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Paste the license key you received after purchase
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      value={licenseKey}
                      onChange={(e) => {
                        setLicenseKey(e.target.value);
                        setValidationStatus("idle");
                        setError(null);
                      }}
                      className="h-12 font-mono text-sm pr-10"
                      disabled={isLoading}
                    />
                    {validationStatus === "valid" && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                    {validationStatus === "invalid" && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />
                    )}
                  </div>
                  
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}
                  
                  {validationStatus === "valid" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                    >
                      <CheckCircle className="h-4 w-4" />
                      License is valid! Click activate to continue.
                    </motion.div>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full h-11"
                    size="lg"
                    disabled={isLoading || !licenseKey.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {validateLicense.isPending ? "Validating..." : "Activating..."}
                      </>
                    ) : validationStatus === "valid" ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate License
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Validate License
                      </>
                    )}
                  </Button>
                </div>
              </form>
              
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Don't have a license?{" "}
                  <a
                    href="https://querystudio.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Purchase one
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>
            
            {/* Version info */}
            <p className="text-center text-xs text-muted-foreground/50 mt-6">
              QueryStudio v0.1.0
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
