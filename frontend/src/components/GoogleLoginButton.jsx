import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const GoogleLoginButton = ({ onSuccess, onError, text = 'Continue with Google' }) => {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(async (response) => {
    if (!response.credential) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await googleLogin(response.credential);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Google login error:', err);
      const msg = typeof err === 'string' ? err : 'Google authentication failed';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  }, [googleLogin, onError, onSuccess]);

  useEffect(() => {
    if (!clientId) return;
    let scriptWithLoadListener = null;

    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });

        const btnContainer = document.getElementById('google-signin-btn-container');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left',
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      const existingScript = document.getElementById('google-jssdk');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-jssdk';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initializeGoogle;
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener('load', initializeGoogle);
        scriptWithLoadListener = existingScript;
      }
    }

    return () => {
      if (scriptWithLoadListener) {
        scriptWithLoadListener.removeEventListener('load', initializeGoogle);
      }
    };
  }, [clientId, handleCredentialResponse]);

  return (
    <div className="w-full space-y-2">
      {errorMsg && (
        <p className="text-center text-xs font-semibold text-red-600">{errorMsg}</p>
      )}

      {clientId ? (
        <div className="flex w-full min-h-[44px] items-center justify-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-primary">
              <Loader2 size={18} className="animate-spin" /> Signing in with Google...
            </div>
          ) : (
            <div id="google-signin-btn-container" className="w-full flex justify-center" />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            alert(
              'Google Client ID missing!\n\nTo activate Google Login:\n1. Add GOOGLE_CLIENT_ID to backend/.env\n2. Add VITE_GOOGLE_CLIENT_ID to frontend/.env'
            );
          }}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-400"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {text}
        </button>
      )}
    </div>
  );
};

export default GoogleLoginButton;
