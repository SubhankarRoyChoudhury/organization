"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ChevronLeft } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import {
  get_Hospital_User_Login_Details,
  createRoomRecord,
  updateRoomRecord,
  getRooms,
  getWards,
  getBeds,
} from "@/app/api/apiService";
import SuccessDialog from "../../../SuccessDialog/page";

const ROOM_TYPE_OPTIONS = ["General", "Private", "ICU", "Day Care", "Suite"];
const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Occupied", label: "Occupied" },
  { value: "Reserved", label: "Reserved" },
  { value: "Maintenance", label: "Maintenance" },
];
const STATUS_STYLES = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-red-100 text-red-700",
  reserved: "bg-blue-100 text-blue-700",
  maintenance: "bg-amber-100 text-amber-700",
};

export default function RoomsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [rooms, setRooms] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const resolvedCompanyId =
    loggedInDetails?.company_id || loggedInDetails?.companies?.[0]?.company_id;
  const dialogRef = useRef(null);
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const initialFormState = {
    room_no: "",
    room_type: "",
    ward: "",
    price_per_day: "",
    status: "",
  };

  const [formState, setFormState] = useState(initialFormState);

  const formatWardOptionLabel = (ward) => {
    if (!ward) return "Unnamed Ward";
    const name = ward.name || "Unnamed Ward";
    const code =
      ward.ward_code !== undefined && ward.ward_code !== null
        ? String(ward.ward_code).trim()
        : null;
    let genderRaw = ward.gender_type_display || null;
    if (!genderRaw && typeof ward.gender_type === "string") {
      const trimmed = ward.gender_type.trim();
      if (trimmed) {
        genderRaw = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      }
    }
    const suffixParts = [];
    if (code) suffixParts.push(code);
    if (genderRaw) suffixParts.push(genderRaw);
    return suffixParts.length ? `${name} (${suffixParts.join(" • ")})` : name;
  };

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) fetchUserDetails(username);
  }, []);

  const fetchUserDetails = async (username) => {
    try {
      const data = await get_Hospital_User_Login_Details(username);
      setLoggedInDetails(data);
      const resolvedCompanyId =
        data?.company_id || data?.companies?.[0]?.company_id || localStorage.getItem("company_id");
      fetchWards(resolvedCompanyId);
      fetchRooms(resolvedCompanyId);
      fetchBeds(resolvedCompanyId);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchWards = async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getWards(company_id);
      setWards(data);
    } catch (error) {
      console.error("Unable to load wards:", error);
    }
  };

  const fetchRooms = async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getRooms(company_id);
      setRooms(data);
    } catch (error) {
      console.error("Unable to load rooms:", error);
    }
  };

  const fetchBeds = async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getBeds(company_id);
      setBeds(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load beds:", error);
      setBeds([]);
    }
  };

  const filteredRooms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rooms;
    return rooms.filter((room) =>
      [
        room.room_no,
        room.room_type,
        room.ward_name,
        room.status,
        room.price_per_day,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [searchTerm, rooms]);

  const bedCountsByRoom = useMemo(() => {
    const counts = {};
    beds.forEach((bed) => {
      const roomId = bed?.room;
      if (!roomId) return;
      if (!counts[roomId]) {
        counts[roomId] = { total: 0, available: 0 };
      }
      counts[roomId].total += 1;
      if (bed.is_available !== false) {
        counts[roomId].available += 1;
      }
    });
    return counts;
  }, [beds]);

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRoomId(null);
    setFormState(initialFormState);
    setFormError(null);
    setDialogPosition({ x: 0, y: 0 });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: name === "price_per_day" ? value.replace(/[^\d.]/g, "") : value,
    }));
  };

  const handleEditRoom = (room) => {
    setEditingRoomId(room.id);
    setIsDialogOpen(true);
    setDialogPosition({ x: 0, y: 0 });
    setFormError(null);
    setFormState({
      room_no: room.room_no || "",
      room_type: room.room_type || "",
      ward: room.ward ? String(room.ward) : "",
      price_per_day:
        room.price_per_day !== null && room.price_per_day !== undefined
          ? String(room.price_per_day)
          : "",
      status: room.status || "",
    });
  };

  const handleAddRoom = async (event) => {
    event.preventDefault();

    if (!formState.room_no.trim() || !formState.ward) {
      setFormError("Room number and ward are required.");
      return;
    }

    if (!resolvedCompanyId) {
      setFormError("Missing company context. Please refresh.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        room_no: formState.room_no.trim(),
        room_type: formState.room_type || null,
        ward: formState.ward ? Number(formState.ward) : null,
        price_per_day: formState.price_per_day
          ? Number(formState.price_per_day)
          : 0,
        status: formState.status || null,
      };
      if (editingRoomId) {
        await updateRoomRecord(editingRoomId, payload, resolvedCompanyId);
      } else {
        await createRoomRecord(payload, resolvedCompanyId);
      }
      handleDialogClose();
      setSuccessMessage(
        editingRoomId
          ? "Room updated successfully"
          : "Room created successfully",
      );
      setIsSuccessDialogOpen(true);
      fetchRooms(resolvedCompanyId);
    } catch (creationError) {
      console.error("Error creating room:", creationError);
      const apiError =
        creationError.response?.data?.errors ||
        creationError.response?.data?.detail ||
        "Could not create room.";
      setFormError(
        typeof apiError === "string" ? apiError : "Could not create room.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clampDialogPosition = useCallback((position) => {
    const dialog = dialogRef.current;
    if (!dialog || typeof window === "undefined") return position;
    const padding = 2;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dialogWidth = dialog.offsetWidth;
    const dialogHeight = dialog.offsetHeight;
    const maxX = Math.max(0, (viewportWidth - dialogWidth) / 2 - padding);
    const maxY = Math.max(0, (viewportHeight - dialogHeight) / 2 - padding);
    return {
      x: Math.min(maxX, Math.max(-maxX, position.x)),
      y: Math.min(maxY, Math.max(-maxY, position.y)),
    };
  }, []);

  useEffect(() => {
    if (!isDialogOpen) return;
    setDialogPosition({ x: 0, y: 0 });
  }, [isDialogOpen]);

  useEffect(() => {
    if (!isDraggingDialog) return;
    const handleMouseMove = (event) => {
      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;
      setDialogPosition(
        clampDialogPosition({
          x: dragStateRef.current.originX + deltaX,
          y: dragStateRef.current.originY + deltaY,
        }),
      );
    };
    const handleMouseUp = () => {
      setIsDraggingDialog(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampDialogPosition, isDraggingDialog]);

  useEffect(() => {
    if (!isDialogOpen) return;
    const handleResize = () => {
      setDialogPosition((prev) => clampDialogPosition(prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampDialogPosition, isDialogOpen]);

  const handleDialogDragStart = (event) => {
    event.preventDefault();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: dialogPosition.x,
      originY: dialogPosition.y,
    };
    setIsDraggingDialog(true);
  };

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false);
  };

  const normalizedUserType = String(loggedInDetails?.user_type || "")
    .trim()
    .toLowerCase();
  const canAccessValue = loggedInDetails?.can_access;
  const normalizedCanAccess =
    canAccessValue === true ||
    canAccessValue === "true" ||
    canAccessValue === "True" ||
    canAccessValue === 1 ||
    canAccessValue === "1"
      ? true
      : canAccessValue === false ||
          canAccessValue === "false" ||
          canAccessValue === "False" ||
          canAccessValue === 0 ||
          canAccessValue === "0"
        ? false
        : null;
  const isCompanyAdmin = normalizedUserType === "company_admin";
  const isAccessRestricted = !isCompanyAdmin && normalizedCanAccess === false;

  return (
    <section className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-500">
                IPD Admin
              </p>
              <h1 className="text-2xl font-bold text-slate-800">
                Room Inventory
              </h1>
              <p className="text-sm text-slate-500">
                Monitor availability across wards and assign rooms instantly.
              </p>
              </div>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs uppercase text-slate-400">
                Total Rooms
              </span>
              <span className="text-2xl font-semibold text-slate-800">
                {rooms.length}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search Here..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2 pr-11 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring focus:ring-blue-200/40"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsDialogOpen(true);
                setDialogPosition({ x: 0, y: 0 });
              }}
              disabled={isAccessRestricted}
              className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                isAccessRestricted
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-blue-700"
              }`}
            >
              <span className="text-lg">＋</span>
              Add Room
            </button>
          </div>
        </header>
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="w-16 px-3 py-3 text-center text-[11px]">
                    Sl. No.
                  </th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Ward</th>
                  <th className="px-6 py-4">Beds</th>
                  <th className="px-6 py-4">Rate (₹)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room, index) => {
                  const statusKey = String(room.status || "").toLowerCase();
                  const statusClasses =
                    STATUS_STYLES[statusKey] || "bg-slate-100 text-slate-600";
                  return (
                    <tr key={room.id} className="text-slate-700">
                      <td className="px-3 py-3 text-center text-xs font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {room.room_no}
                        </div>
                        {/* <p className="text-xs text-slate-500">
                          ID: #{room.id?.toString().padStart(4, "0")}
                        </p> */}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{room.ward_name || "—"}</p>
                        {room.ward_gender_type && (
                          <p className="text-xs text-slate-500">
                            {room.ward_gender_type}
                          </p>
                        )}
                      </td>
                      {/* <td className="px-6 py-4">{room.room_type}</td> */}
                      <td className="px-6 py-4">
                        {(() => {
                          const counts = bedCountsByRoom[room.id] || {
                            total: 0,
                            available: 0,
                          };
                          return `Available ${counts.available} of ${counts.total}`;
                        })()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        ₹
                        {Number(room.price_per_day || 0).toLocaleString(
                          "en-IN",
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
                        >
                          {room.status || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ActionMenu
                          buttonLabel="Room actions"
                          disabled={isAccessRestricted}
                          items={[
                            {
                              label: "Edit",
                              onClick: () => handleEditRoom(room),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
                {filteredRooms.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No rooms match “{searchTerm}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {isDialogOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
            <div
              ref={dialogRef}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              style={{
                transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
              }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {editingRoomId ? "Edit Room" : "Add Room"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {editingRoomId
                      ? "Update the room details."
                      : "Fill in the room details to add it to the inventory."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onMouseDown={handleDialogDragStart}
                    className="cursor-grab rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    aria-label="Drag dialog"
                  >
                    <GripVertical size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDialogClose}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {formError && (
                <p className="mb-2 text-sm text-red-600">{formError}</p>
              )}
              <form className="space-y-4" onSubmit={handleAddRoom}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">
                    Room Number
                    <input
                      type="text"
                      name="room_no"
                      value={formState.room_no}
                      onChange={handleChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-200/40"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Ward
                    <select
                      name="ward"
                      value={formState.ward}
                      onChange={handleChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-200/40"
                    >
                      <option value="">Select ward</option>
                      {wards.map((ward) => (
                        <option key={ward.id} value={ward.id}>
                          {formatWardOptionLabel(ward)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Type
                    <select
                      name="room_type"
                      value={formState.room_type}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-200/40"
                    >
                      <option value="">Select type</option>
                      {ROOM_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Price / Day (₹)
                    <input
                      type="number"
                      name="price_per_day"
                      value={formState.price_per_day}
                      min={0}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-200/40 no-number-spin"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Status
                    <select
                      name="status"
                      value={formState.status}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-200/40"
                    >
                      <option value="">Select Status</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleDialogClose}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-75"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : editingRoomId
                        ? "Update Room"
                        : "Add Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <style jsx global>{`
          .no-number-spin::-webkit-inner-spin-button,
          .no-number-spin::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .no-number-spin {
            -moz-appearance: textfield;
            appearance: textfield;
          }
        `}</style>
        <SuccessDialog
          open={isSuccessDialogOpen}
          onClose={closeSuccessDialog}
          message={successMessage}
        />
      </div>
    </section>
  );
}
