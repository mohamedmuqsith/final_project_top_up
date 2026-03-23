import { useState, useEffect } from "react";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { 
  Building2Icon, 
  MapPinIcon, 
  GlobeIcon, 
  CoinsIcon, 
  TruckIcon, 
  ShieldCheckIcon,
  SaveIcon
} from "lucide-react";

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/settings");
      setSettings(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.patch("/admin/settings", settings);
      toast.success("Settings updated successfully");
      setSaving(false);
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
      setSaving(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section) {
      setSettings({
        ...settings,
        [section]: {
          ...settings[section],
          [field]: value
        }
      });
    } else {
      setSettings({
        ...settings,
        [field]: value
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Store Settings</h1>
          <p className="text-sm text-base-content/60">Manage your Sri Lanka-specific business details and localization.</p>
        </div>
        <button 
          onClick={handleUpdate}
          disabled={saving}
          className="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20"
        >
          {saving ? <span className="loading loading-spinner loading-xs"></span> : <SaveIcon className="w-4 h-4 mr-2" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STORE PROFILE */}
        <div className="card bg-base-100 border border-base-300/60 shadow-sm rounded-3xl overflow-hidden">
          <div className="card-body p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2Icon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Store Profile</h2>
            </div>

            <div className="space-y-4">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Store Name</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeName}
                  onChange={(e) => handleInputChange(null, "storeName", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Support Email</span></label>
                <input 
                  type="email" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeEmail}
                  onChange={(e) => handleInputChange(null, "storeEmail", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Support Phone</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storePhone}
                  onChange={(e) => handleInputChange(null, "storePhone", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* LOCALIZATION */}
        <div className="card bg-base-100 border border-base-300/60 shadow-sm rounded-3xl overflow-hidden">
          <div className="card-body p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                <GlobeIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Localization</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Currency</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.localization.currency}
                  onChange={(e) => handleInputChange("localization", "currency", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Symbol</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.localization.currencySymbol}
                  onChange={(e) => handleInputChange("localization", "currencySymbol", e.target.value)}
                />
              </div>
              <div className="form-control w-full col-span-2">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Timezone</span></label>
                <select 
                  className="select select-bordered rounded-2xl bg-base-200/40 w-full"
                  value={settings.localization.timezone}
                  onChange={(e) => handleInputChange("localization", "timezone", e.target.value)}
                >
                  <option value="Asia/Colombo">Asia/Colombo (Sri Lanka)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* STORE ADDRESS */}
        <div className="card bg-base-100 border border-base-300/60 shadow-sm rounded-3xl overflow-hidden md:col-span-2">
          <div className="card-body p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <MapPinIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Store Address (Sri Lanka Format)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control w-full md:col-span-2">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Address Line 1</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeAddress.line1}
                  onChange={(e) => handleInputChange("storeAddress", "line1", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Address Line 2 (City Area)</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeAddress.line2}
                  onChange={(e) => handleInputChange("storeAddress", "line2", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">City / Town</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeAddress.city}
                  onChange={(e) => handleInputChange("storeAddress", "city", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">District</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeAddress.district}
                  onChange={(e) => handleInputChange("storeAddress", "district", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Province</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeAddress.province}
                  onChange={(e) => handleInputChange("storeAddress", "province", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Postal Code</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.storeAddress.postalCode}
                  onChange={(e) => handleInputChange("storeAddress", "postalCode", e.target.value)}
                />
              </div>
              <div className="form-control w-full col-span-2">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Country</span></label>
                <input 
                  type="text" 
                  className="disabled input input-bordered rounded-2xl bg-base-300/40 opacity-70 cursor-not-allowed" 
                  value="Sri Lanka" 
                  readOnly 
                />
              </div>
            </div>
          </div>
        </div>

        {/* SHIPPING & TAX */}
        <div className="card bg-base-100 border border-base-300/60 shadow-sm rounded-3xl overflow-hidden">
          <div className="card-body p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                <TruckIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Shipping Logic (LKR)</h2>
            </div>

            <div className="space-y-4">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Default Shipping Fee</span></label>
                <input 
                  type="number" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.shipping.defaultFee}
                  onChange={(e) => handleInputChange("shipping", "defaultFee", Number(e.target.value))}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Free Shipping Threshold</span></label>
                <input 
                  type="number" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.shipping.freeThreshold}
                  onChange={(e) => handleInputChange("shipping", "freeThreshold", Number(e.target.value))}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Available Couriers</span></label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {settings.shipping.couriers.map((c, idx) => (
                    <div key={idx} className="badge badge-lg bg-base-200 border-none rounded-xl gap-2 py-4">
                      {c}
                      <button 
                        onClick={() => {
                          const newCouriers = [...settings.shipping.couriers];
                          newCouriers.splice(idx, 1);
                          handleInputChange("shipping", "couriers", newCouriers);
                        }}
                        className="btn btn-ghost btn-xs btn-circle hover:bg-error/10 hover:text-error"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const name = prompt("Enter courier name:");
                      if (name) {
                        handleInputChange("shipping", "couriers", [...settings.shipping.couriers, name]);
                      }
                    }}
                    className="btn btn-ghost btn-sm rounded-xl border-dashed border-2 border-base-300"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAX & COMPLIANCE */}
        <div className="card bg-base-100 border border-base-300/60 shadow-sm rounded-3xl overflow-hidden">
          <div className="card-body p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-success/10 text-success">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Tax & Compliance</h2>
            </div>

            <div className="space-y-4">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Tax Label (e.g. VAT, SSCL)</span></label>
                <input 
                  type="text" 
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.tax.label}
                  onChange={(e) => handleInputChange("tax", "label", e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold uppercase opacity-50">Tax Rate (%)</span></label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input input-bordered rounded-2xl bg-base-200/40" 
                  value={settings.tax.rate}
                  onChange={(e) => handleInputChange("tax", "rate", Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
