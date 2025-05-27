"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/lib/api";

const ProfilePage = () => {
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editField, setEditField] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const data = await usersApi.me();
        setUser(data);
        setUsername(data.username || "");
        setEmail(data.email || "");
      } catch (e) {
        setMessage("Failed to load user info");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, username, email }),
      });
      if (res.ok) {
        setMessage("Profile updated!");
        setChanged(false);
        setEditField(null);
      } else {
        setMessage("Failed to update profile");
      }
    } catch (e) {
      setMessage("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleCalendar = async () => {
    setMessage("");
    try {

      const res = await usersApi.saveGoogleCalendar({
        google_user_id: "test_id",
        access_token: "test_access_token",
        refresh_token: "test_refresh_token",
        expires_at: Date.now() + 3600 * 1000,
      });
      setMessage(res.message || "Google Calendar integrated!");
    } catch (e) {
      setMessage("Failed to integrate Google Calendar");
    }
  };

  // Minimalist field renderer
  const renderField = (label: string, value: string, field: string, editable = true) => (
    <div className="flex items-center space-x-2 py-2">
      <span className="text-gray-400 w-24 text-sm">{label}</span>
      {editField === field && editable ? (
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => {
            setChanged(true);
            if (field === "username") setUsername(e.target.value);
          }}
          onBlur={() => setEditField(null)}
          onKeyDown={e => {
            if (e.key === "Enter") setEditField(null);
          }}
          className="border-b border-gray-300 bg-transparent px-1 py-0.5 text-gray-900 outline-none text-base min-w-[120px]"
        />
      ) : (
        <span
          className={`text-base text-gray-900 cursor-${editable ? "pointer" : "default"} px-1 py-0.5 rounded hover:bg-gray-100`}
          onClick={() => editable && setEditField(field)}
        >
          {value || <span className="text-gray-300">Click to set</span>}
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-xl font-bold mb-8 text-gray-900">Profile</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2 border-b pb-4">
            {renderField("Username", username, "username", true)}
            {renderField("Email", email, "email", false)}
          </div>
          <div className="flex space-x-2 pt-2">
            {changed && (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button type="button" variant="ghost" className="text-gray-700 border border-gray-200" onClick={handleGoogleCalendar}>
              Google Calendar Integration
            </Button>
            <Button type="button" variant="ghost" className="text-gray-700 border border-gray-200" disabled>
              Telegram Bot Integration
            </Button>
          </div>
          {message && <div className="text-sm text-green-600 mt-2">{message}</div>}
        </div>
      )}
    </div>
  );
};

export default ProfilePage; 