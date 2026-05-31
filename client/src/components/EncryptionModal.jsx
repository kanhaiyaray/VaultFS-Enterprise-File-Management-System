import { useState } from 'react';
import { Shield, Eye, EyeOff, Loader2, X, Key } from 'lucide-react';

export default function EncryptionModal({ onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-md shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
              <Shield size={15} className="text-brand-glow" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-sm">End-to-End Encryption</h3>
              <p className="text-[11px] text-gray-500">Secure your files with a password</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-900/10 border border-amber-900/20 rounded-lg">
            <p className="text-xs text-amber-300/80 leading-relaxed">
              ⚠️ Important: The encryption password cannot be recovered. If you lose it, your files will be inaccessible forever.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Key size={11} /> Encryption Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-9"
                placeholder="Enter a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
            <input
              type="password"
              className="input"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-xs text-accent-red">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              {loading ? 'Encrypting...' : 'Encrypt & Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}