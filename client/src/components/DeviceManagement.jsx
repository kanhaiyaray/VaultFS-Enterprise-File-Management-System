import { useState, useEffect } from 'react';
import { Smartphone, Laptop, Tablet, CheckCircle, Trash2, Shield, Loader2, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const DeviceIcon = ({ platform }) => {
  const p = (platform || '').toLowerCase();
  if (p.includes('win') || p.includes('mac') || p.includes('linux')) return <Laptop size={16} />;
  if (p.includes('iphone') || p.includes('android')) return <Smartphone size={16} />;
  if (p.includes('ipad')) return <Tablet size={16} />;
  return <Smartphone size={16} />;
};

export default function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trusting, setTrusting] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/users/devices');
      setDevices(data.devices || []);
    } catch (err) {
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const trustDevice = async (deviceId) => {
    setTrusting(deviceId);
    try {
      await api.post(`/api/users/devices/${deviceId}/trust`);
      toast.success('Device trusted');
      fetchDevices();
    } catch (err) {
      toast.error('Failed to trust device');
    } finally {
      setTrusting(null);
    }
  };

  const revokeDevice = async (deviceId) => {
    if (!confirm('Remove this device from trusted list?')) return;
    try {
      await api.delete(`/api/users/devices/${deviceId}`);
      toast.success('Device removed');
      fetchDevices();
    } catch (err) {
      toast.error('Failed to remove device');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-glow" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
            <Shield size={14} className="text-brand-glow" /> Trusted Devices
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage which devices can access your account without extra verification
          </p>
        </div>
        <button onClick={fetchDevices} className="btn-ghost text-xs px-3 py-1.5">
          <RefreshCw size={12} />
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="card p-8 text-center">
          <Smartphone size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No devices recorded yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Devices will appear here after you log in
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <div key={device._id} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  device.isTrusted ? 'bg-brand/10 border-brand/20' : 'bg-surface-2 border-surface-4'
                }`}>
                  <DeviceIcon platform={device.platform} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    {device.deviceName || device.platform || 'Unknown Device'}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    Last seen: {new Date(device.lastSeenAt).toLocaleDateString()}
                  </p>
                  {device.suspicionReason && (
                    <p className="text-[10px] text-accent-red mt-0.5">
                      ⚠️ {device.suspicionReason.slice(0, 60)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {device.isTrusted ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle size={12} /> Trusted
                  </span>
                ) : (
                  <button
                    onClick={() => trustDevice(device._id)}
                    disabled={trusting === device._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand/10 border border-brand/20 text-brand-glow hover:bg-brand/20 transition-all"
                  >
                    {trusting === device._id ? <Loader2 size={10} className="animate-spin" /> : <Shield size={10} />}
                    Trust
                  </button>
                )}
                <button
                  onClick={() => revokeDevice(device._id)}
                  className="p-2 rounded-lg text-gray-600 hover:text-accent-red hover:bg-red-900/10 transition-all"
                  title="Remove device"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-3 bg-amber-900/10 border-amber-900/20">
        <p className="text-xs text-amber-300/80 leading-relaxed flex items-start gap-2">
          <Shield size={12} className="mt-0.5 flex-shrink-0" />
          When logging in from a new device or location, you'll receive an email alert. 
          Trusted devices bypass suspicious login checks.
        </p>
      </div>
    </div>
  );
}