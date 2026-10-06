import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SignatureCanvas from 'react-signature-canvas';
import { useToast, ToastContainer } from './UI.jsx';

export function SignDocument() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toasts, toast } = useToast();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const signaturePadRef = useRef(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await api.drafts.getSignatureRequest(token);
        setRequest(res.data);
      } catch (err) {
        setError(err.message || 'Invalid or expired signature link.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [token]);

  const handleSign = async () => {
    if (!reviewConfirmed || !hasDrawnSignature) return;
    try {
      setLoading(true);
      const signature_data = signaturePadRef.current?.toDataURL() || null;
      if (!signature_data) {
        toast('Failed to capture signature image.', 'error');
        return;
      }
      
      await api.drafts.completeSignature(token, {
        signature_data,
        ip_address: '0.0.0.0',
        device_info: window.navigator.userAgent,
      });
      
      setIsSigned(true);
      toast('Document signed successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Signature failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !request && !error) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/[0.03] border border-red-500/20 p-8 rounded-[2rem] text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-900 text-white mb-2">Access Denied</h2>
          <p className="text-[#8a94a6] mb-8">{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-secondary w-full justify-center">Return to Homepage</button>
        </div>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-md w-full bg-white/[0.03] border border-emerald-500/20 p-8 rounded-[2rem] text-center shadow-2xl relative z-10">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-900 text-white mb-2 tracking-tight">Signature Complete</h2>
          <p className="text-[#8a94a6] mb-8">Thank you. The document has been securely signed and finalized.</p>
          <button onClick={() => window.close()} className="btn btn-primary w-full justify-center">Close Window</button>
        </div>
      </div>
    );
  }

  const { draft } = request;

  return (
    <div className="min-h-screen bg-[#05080f] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-900 text-white tracking-tight mb-2">Secure Document E-Sign</h1>
          <p className="text-[#8a94a6] font-600">Please review and sign the document below.</p>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
            <p className="text-[10px] text-[#38bdf8] font-900 uppercase tracking-widest mb-2">Document Title</p>
            <h2 className="text-2xl font-800 text-white">{draft.title}</h2>
          </div>
          
          <div className="p-8 bg-white/[0.01]">
            <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest mb-4">Document Content</p>
            <div className="prose prose-invert max-w-none text-[#b8c2d1] leading-relaxed bg-white/[0.02] border border-white/5 p-6 rounded-2xl max-h-[500px] overflow-y-auto whitespace-pre-wrap font-serif">
              {draft.content || 'No content provided.'}
            </div>
          </div>

          <div className="p-8 border-t border-white/5 bg-white/[0.02]">
            <h3 className="text-lg font-900 text-white mb-6">Execution & Signature</h3>
            
            <div className="space-y-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-[6px] border-white/10 bg-white/5 text-[#38bdf8] focus:ring-[#38bdf8]/50"
                />
                <div>
                  <span className="text-[14px] text-white font-700 block">I confirm I have reviewed this document</span>
                  <span className="text-[12px] text-[#8a94a6]">By checking this box, I agree to be legally bound by its terms.</span>
                </div>
              </label>

              <div className={`transition-all duration-300 ${reviewConfirmed ? 'opacity-100 h-auto' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-800 text-[#8a94a6] uppercase tracking-widest">Draw Signature Below</p>
                  <button 
                    onClick={() => {
                      signaturePadRef.current?.clear();
                      setHasDrawnSignature(false);
                    }} 
                    className="text-[11px] text-[#38bdf8] hover:text-white transition-colors uppercase tracking-wider font-700"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden border-2 border-white/10 hover:border-[#38bdf8]/50 transition-colors">
                  <SignatureCanvas
                    ref={signaturePadRef}
                    canvasProps={{ className: 'w-full h-[200px] cursor-crosshair' }}
                    backgroundColor="#ffffff"
                    penColor="#0f172a"
                    onEnd={() => setHasDrawnSignature(true)}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <button
                  onClick={handleSign}
                  disabled={!reviewConfirmed || !hasDrawnSignature || loading}
                  className={`w-full h-14 rounded-2xl font-900 uppercase tracking-widest text-[14px] transition-all shadow-xl ${
                    reviewConfirmed && hasDrawnSignature && !loading
                      ? 'bg-[#38bdf8] text-slate-900 hover:bg-[#7dd3fc] hover:scale-[1.02] shadow-[#38bdf8]/20'
                      : 'bg-white/5 text-[#8a94a6] cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Processing...' : 'Complete Signature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
