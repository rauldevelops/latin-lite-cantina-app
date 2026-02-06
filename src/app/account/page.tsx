"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatPhoneNumber } from "@/lib/formatPhone";

type ProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

type Address = {
  id: string;
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zipCode: string;
  deliveryNotes: string | null;
  isDefault: boolean;
};

type AddressFormData = {
  street: string;
  unit: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryNotes: string;
  isDefault: boolean;
};

const emptyAddress: AddressFormData = {
  street: "",
  unit: "",
  city: "",
  state: "",
  zipCode: "",
  deliveryNotes: "",
  isDefault: false,
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Page-level state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormData>({ ...emptyAddress });
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session) return;

    async function fetchData() {
      try {
        const [profileRes, addressesRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/addresses"),
        ]);

        if (profileRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!profileRes.ok || !addressesRes.ok) {
          throw new Error("Failed to load account data");
        }

        const [profileData, addressesData] = await Promise.all([
          profileRes.json(),
          addressesRes.json(),
        ]);

        setProfile(profileData);
        setAddresses(addressesData);
      } catch {
        setError("Failed to load account data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session, router]);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  // --- Profile handlers ---

  function startEditProfile() {
    if (!profile) return;
    setProfileForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email || "",
      phone: profile.phone ? formatPhoneNumber(profile.phone) : "",
    });
    setEditingProfile(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          phone: profileForm.phone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const updated = await res.json();
      setProfile(updated);
      setEditingProfile(false);
      showSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  // --- Address handlers ---

  function startEditAddress(addr: Address) {
    setEditingAddressId(addr.id);
    setShowNewAddressForm(false);
    setAddressForm({
      street: addr.street,
      unit: addr.unit || "",
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      deliveryNotes: addr.deliveryNotes || "",
      isDefault: addr.isDefault,
    });
  }

  function startNewAddress() {
    setEditingAddressId(null);
    setAddressForm({ ...emptyAddress });
    setShowNewAddressForm(true);
  }

  function cancelAddressForm() {
    setEditingAddressId(null);
    setShowNewAddressForm(false);
    setAddressForm({ ...emptyAddress });
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);
    setError("");

    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save address");
      }

      const saved = await res.json();
      setAddresses((prev) => {
        if (saved.isDefault) {
          return [...prev.map((a) => ({ ...a, isDefault: false })), saved];
        }
        return [...prev, saved];
      });
      setShowNewAddressForm(false);
      setAddressForm({ ...emptyAddress });
      showSuccess("Address added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleUpdateAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAddressId) return;
    setSavingAddress(true);
    setError("");

    try {
      const res = await fetch(`/api/addresses/${editingAddressId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update address");
      }

      const updated = await res.json();
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === updated.id) return updated;
          if (updated.isDefault) return { ...a, isDefault: false };
          return a;
        })
      );
      setEditingAddressId(null);
      setAddressForm({ ...emptyAddress });
      showSuccess("Address updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update address");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!confirm("Delete this address?")) return;
    setDeletingAddressId(id);
    setError("");

    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete address");
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showSuccess("Address deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setError("");
    const addr = addresses.find((a) => a.id === id);
    if (!addr || addr.isDefault) return;

    // Optimistic update
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );

    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addr, isDefault: true }),
      });
      if (!res.ok) throw new Error("Failed to set default");
      showSuccess("Default address updated");
    } catch (err) {
      // Revert optimistic update
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === addr.id ? false : a.isDefault }))
      );
      setError(err instanceof Error ? err.message : "Failed to set default");
    }
  }

  // --- Password handler ---

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password");
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  // --- Address form component ---

  function AddressForm({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit: boolean }) {
    return (
      <form onSubmit={onSubmit} className="border border-gray-200 rounded-lg p-4 space-y-3">
        <p className="font-medium text-gray-900 text-sm">
          {isEdit ? "Edit Address" : "New Address"}
        </p>
        <input
          type="text"
          placeholder="Street Address *"
          required
          value={addressForm.street}
          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
        />
        <input
          type="text"
          placeholder="Apt / Unit (optional)"
          value={addressForm.unit}
          onChange={(e) => setAddressForm({ ...addressForm, unit: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="City *"
            required
            value={addressForm.city}
            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
          />
          <input
            type="text"
            placeholder="State *"
            required
            value={addressForm.state}
            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
          />
          <input
            type="text"
            placeholder="ZIP *"
            required
            value={addressForm.zipCode}
            onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Delivery Notes (optional)"
          value={addressForm.deliveryNotes}
          onChange={(e) => setAddressForm({ ...addressForm, deliveryNotes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={addressForm.isDefault}
            onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
          />
          Set as default address
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={savingAddress}
            className="px-4 py-2 bg-latin-red text-white text-sm rounded-full hover:bg-latin-orange uppercase font-semibold disabled:opacity-50 transition-colors"
          >
            {savingAddress ? "SAVING..." : isEdit ? "UPDATE ADDRESS" : "SAVE ADDRESS"}
          </button>
          <button
            type="button"
            onClick={cancelAddressForm}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
          >
            CANCEL
          </button>
        </div>
      </form>
    );
  }

  // --- Loading state ---

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded" />
              <div className="h-64 bg-gray-200 rounded" />
              <div className="h-48 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Account</h1>

        {successMessage && (
          <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
            <button onClick={() => setError("")} className="ml-3 text-red-900 font-medium">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Section 1: Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              {!editingProfile && (
                <button
                  onClick={startEditProfile}
                  className="text-sm text-latin-red hover:text-latin-orange font-medium transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: formatPhoneNumber(e.target.value) })}
                    placeholder="(555) 555-5555"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 bg-latin-red text-white text-sm rounded-full hover:bg-latin-orange uppercase font-semibold disabled:opacity-50 transition-colors"
                  >
                    {savingProfile ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">First Name</p>
                    <p className="text-gray-900">{profile?.firstName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Name</p>
                    <p className="text-gray-900">{profile?.lastName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-gray-900">{profile?.email || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-gray-900">
                    {profile?.phone ? formatPhoneNumber(profile.phone) : "Not set"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Saved Addresses */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Saved Addresses</h2>
              {!showNewAddressForm && !editingAddressId && (
                <button
                  onClick={startNewAddress}
                  className="text-sm text-latin-red hover:text-latin-orange font-medium transition-colors"
                >
                  + Add Address
                </button>
              )}
            </div>

            <div className="space-y-3">
              {addresses.length === 0 && !showNewAddressForm && (
                <p className="text-gray-500 text-sm">No saved addresses. Add one to speed up checkout.</p>
              )}

              {addresses.map((addr) => (
                <div key={addr.id}>
                  {editingAddressId === addr.id ? (
                    <AddressForm onSubmit={handleUpdateAddress} isEdit />
                  ) : (
                    <div
                      className={`border rounded-lg p-4 ${
                        addr.isDefault
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-900 text-sm">
                            {addr.street}
                            {addr.unit && `, ${addr.unit}`}
                          </p>
                          <p className="text-gray-600 text-sm">
                            {addr.city}, {addr.state} {addr.zipCode}
                          </p>
                          {addr.deliveryNotes && (
                            <p className="text-gray-500 text-xs mt-1">
                              Note: {addr.deliveryNotes}
                            </p>
                          )}
                          {addr.isDefault && (
                            <span className="text-xs text-latin-red font-medium">Default</span>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4 shrink-0">
                          {!addr.isDefault && (
                            <button
                              onClick={() => handleSetDefault(addr.id)}
                              className="text-xs text-gray-500 hover:text-latin-red transition-colors"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => startEditAddress(addr)}
                            className="text-xs text-gray-500 hover:text-latin-red transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            disabled={deletingAddressId === addr.id}
                            className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingAddressId === addr.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showNewAddressForm && (
                <AddressForm onSubmit={handleAddAddress} isEdit={false} />
              )}
            </div>
          </div>

          {/* Section 3: Change Password */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

            {passwordSuccess && (
              <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
                Password changed successfully
              </div>
            )}
            {passwordError && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="px-4 py-2 bg-latin-red text-white text-sm rounded-full hover:bg-latin-orange uppercase font-semibold disabled:opacity-50 transition-colors"
              >
                {changingPassword ? "CHANGING..." : "CHANGE PASSWORD"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
