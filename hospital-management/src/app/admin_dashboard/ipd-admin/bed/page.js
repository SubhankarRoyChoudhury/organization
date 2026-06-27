"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ChevronLeft } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import {
  get_Hospital_User_Login_Details,
  createBedRecord,
  updateBedRecord,
  getBeds,
  getRooms,
} from "@/app/api/apiService";

import SuccessDialog from "../../../SuccessDialog/page";

const DUPLICATE_BED_ERROR = "This Bed Number already exists.";
const BED_SUFFIX_REQUIRED_ERROR =
  "Please add a number after the room prefix (e.g., 101-1).";

export default function BedsPage() {
  const router = useRouter();
  const [error, setError] = useState(null);

  const [formState, setFormState] = useState({
    bed_no: "",
    status: "AVAILABLE",
    room: "",
  });

  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false); // State for the success dialog
  const [successMessage, setSuccessMessage] = useState(""); // State for the success message
  const [roomFilter, setRoomFilter] = useState("");

  const [loggedInDetails, setLoggedInDetails] = useState(null);
  const [editingBedId, setEditingBedId] = useState(null);
  const bedNumberInputRef = useRef(null);
  const shouldFocusBedNumberRef = useRef(false);
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
      fetchBeds(resolvedCompanyId);
      fetchRooms(resolvedCompanyId);
      setError(null);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to fetch user details.");
    }
  };

  const fetchBeds = async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getBeds(company_id);
      console.log(data);

      setBeds(data);
    } catch (err) {
      console.error("Error loading beds:", err);
    }
  };

  const fetchRooms = async (company_id) => {
    if (!company_id) return;
    try {
      const data = await getRooms(company_id);
      setRooms(data);
    } catch (err) {
      console.error("Error loading rooms:", err);
    }
  };
  const formatRoomOptionLabel = (room) => {
    const roomNo = room?.room_no ? String(room.room_no).trim() : "Room";
    const wardName = room?.ward_name ? String(room.ward_name).trim() : null;
    const genderRaw =
      room?.ward_gender_type ||
      (typeof room?.ward_gender === "string" && room.ward_gender.trim()
        ? room.ward_gender.trim().charAt(0).toUpperCase() +
          room.ward_gender.trim().slice(1)
        : null);
    if (!wardName && !genderRaw) return roomNo;
    if (!genderRaw) return `${roomNo} - ${wardName}`;
    if (!wardName) return `${roomNo} - ${genderRaw}`;
    return `${roomNo} - ${wardName} (${genderRaw})`;
  };
  const formatBedWardLabel = (bed) => {
    const wardName =
      typeof bed?.ward_name === "string" && bed.ward_name.trim()
        ? bed.ward_name.trim()
        : null;
    const genderRaw =
      bed?.ward_gender_type ||
      (typeof bed?.ward_gender === "string" && bed.ward_gender.trim()
        ? bed.ward_gender.trim().charAt(0).toUpperCase() +
          bed.ward_gender.trim().slice(1)
        : null);
    if (!wardName && !genderRaw) return null;
    if (!genderRaw) return wardName;
    if (!wardName) return genderRaw;
    return `${wardName} (${genderRaw})`;
  };
  const normalizeBedValue = (value) =>
    value === null || value === undefined ? "" : String(value).trim();

  const getBedSuffix = (roomNo, bedNo) => {
    if (!bedNo) return "";
    if (!roomNo) return bedNo;
    const prefix = `${roomNo}-`;
    if (bedNo.startsWith(prefix)) return bedNo.slice(prefix.length);
    if (bedNo.startsWith(roomNo)) {
      const remainder = trimLeadingSeparators(bedNo.slice(roomNo.length));
      return remainder || bedNo;
    }
    return bedNo;
  };

  const trimLeadingSeparators = (value) => {
    let index = 0;
    while (index < value.length) {
      const char = value[index];
      if (char !== "-" && char !== "_" && char !== " ") break;
      index += 1;
    }
    return value.slice(index).trim();
  };

  const extractBedComponents = (bed) => {
    const roomNoRaw = normalizeBedValue(bed?.room_no);
    const bedNoRaw = normalizeBedValue(bed?.bed_no);
    if (roomNoRaw) {
      return {
        roomNo: roomNoRaw,
        suffix: getBedSuffix(roomNoRaw, bedNoRaw),
        bedNo: bedNoRaw,
      };
    }
    const splitParts = splitRoomAndSuffix(bedNoRaw);
    if (splitParts) return splitParts;
    return { roomNo: "", suffix: bedNoRaw, bedNo: bedNoRaw };
  };

  const splitRoomAndSuffix = (value) => {
    if (!value) return null;
    const separators = ["-", "_", " "];
    for (const separator of separators) {
      const index = value.indexOf(separator);
      if (index > 0) {
        const roomNo = value.slice(0, index).trim();
        const suffix = value.slice(index + 1).trim();
        if (roomNo && suffix) {
          return { roomNo, suffix, bedNo: value };
        }
      }
    }
    return null;
  };

  const compareNumericString = (left, right) => {
    const leftTrim = normalizeBedValue(left);
    const rightTrim = normalizeBedValue(right);
    if (!leftTrim && !rightTrim) return 0;
    if (!leftTrim) return 1;
    if (!rightTrim) return -1;
    const leftNumber = Number(leftTrim);
    const rightNumber = Number(rightTrim);
    const leftIsNumber = leftTrim !== "" && !Number.isNaN(leftNumber);
    const rightIsNumber = rightTrim !== "" && !Number.isNaN(rightNumber);
    if (leftIsNumber && rightIsNumber) {
      return leftNumber - rightNumber;
    }
    return leftTrim.localeCompare(rightTrim, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };

  const getBedLabel = (bed) => {
    if (!bed) return "";
    const { roomNo, suffix, bedNo } = extractBedComponents(bed);
    if (!roomNo) return bedNo;
    return suffix ? `${roomNo}-${suffix}` : roomNo;
  };

  const sortedBeds = [...beds].sort((a, b) => {
    const aParts = extractBedComponents(a);
    const bParts = extractBedComponents(b);
    const roomCompare = compareNumericString(aParts.roomNo, bParts.roomNo);
    if (roomCompare !== 0) return roomCompare;
    return compareNumericString(aParts.suffix, bParts.suffix);
  });

  // ----------------------------
  // HANDLE INPUT CHANGE
  // ----------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (
      name === "bed_no" &&
      (formError === DUPLICATE_BED_ERROR ||
        formError === BED_SUFFIX_REQUIRED_ERROR)
    ) {
      setFormError(null);
    }
    if (name === "room" && formError === BED_SUFFIX_REQUIRED_ERROR) {
      setFormError(null);
    }
    if (name === "room") {
      const selectedRoom = rooms.find((room) => String(room.id) === value);
      const roomNo = selectedRoom?.room_no
        ? String(selectedRoom.room_no).trim()
        : "";
      if (!editingBedId && roomNo) {
        shouldFocusBedNumberRef.current = true;
        setFormState((prev) => ({
          ...prev,
          room: value,
          bed_no: `${roomNo}-`,
        }));
        return;
      }
    }

    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditBed = (bed) => {
    setEditingBedId(bed.id);
    setModalOpen(true);
    setFormError(null);
    setFormState({
      bed_no: bed.bed_no || "",
      status: bed.status || "AVAILABLE",
      room: bed.room ? String(bed.room) : "",
    });
  };

  const handleOpenAddBed = () => {
    const selectedRoomId = roomFilter ? String(roomFilter) : "";
    const selectedRoom = rooms.find(
      (room) => String(room.id) === selectedRoomId,
    );
    const roomNo = selectedRoom?.room_no
      ? String(selectedRoom.room_no).trim()
      : "";

    setEditingBedId(null);
    setFormError(null);
    shouldFocusBedNumberRef.current = Boolean(roomNo);
    setFormState({
      bed_no: roomNo ? `${roomNo}-` : "",
      status: "AVAILABLE",
      room: selectedRoomId,
    });
    setModalOpen(true);
  };

  // ----------------------------
  // CREATE BED RECORD
  // ----------------------------
  const handleCreateBed = async (event) => {
    event.preventDefault();

    const bedNoTrimmed = formState.bed_no.trim();

    if (!bedNoTrimmed) {
      setFormError("Bed Number is required.");
      return;
    }

    if (!resolvedCompanyId) {
      setFormError("Missing company context. Please refresh and try again.");
      return;
    }

    if (!formState.room) {
      setFormError("Please select a room for the bed.");
      return;
    }

    const selectedRoom = rooms.find(
      (room) => String(room.id) === String(formState.room),
    );
    const roomNo = selectedRoom?.room_no
      ? String(selectedRoom.room_no).trim()
      : "";
    if (roomNo) {
      const prefix = `${roomNo}-`;
      if (bedNoTrimmed === prefix || bedNoTrimmed.endsWith("-")) {
        setFormError(BED_SUFFIX_REQUIRED_ERROR);
        return;
      }
      if (bedNoTrimmed.startsWith(prefix)) {
        const suffix = bedNoTrimmed.slice(prefix.length).trim();
        if (!/^\d+$/.test(suffix)) {
          setFormError(BED_SUFFIX_REQUIRED_ERROR);
          return;
        }
      }
    }

    const normalizedBedNo = bedNoTrimmed.toLowerCase();
    const duplicateBed = beds.find(
      (bed) =>
        String(bed?.id) !== String(editingBedId || "") &&
        String(bed?.bed_no || "").trim().toLowerCase() === normalizedBedNo,
    );
    if (duplicateBed) {
      setFormError(DUPLICATE_BED_ERROR);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        bed_no: bedNoTrimmed,
        status: formState.status || "AVAILABLE",
        room: Number(formState.room),
      };
      if (editingBedId) {
        await updateBedRecord(editingBedId, payload, resolvedCompanyId);
      } else {
        await createBedRecord(payload, resolvedCompanyId);
      }

      // setBeds((prev) => [...prev, newBed]); // update table instantly
      closeDialog();
      setSuccessMessage(
        editingBedId ? "Bed updated successfully" : "Bed saved successfully",
      );
      setIsSuccessDialogOpen(true);
      fetchBeds(resolvedCompanyId);
    } catch (creationError) {
      console.error(creationError);
      const apiError =
        creationError.response?.data?.errors?.bed_no?.[0] ||
        "Could not create bed. Please try again.";
      setFormError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false); // Close the success dialog
  };

  const closeDialog = () => {
    setModalOpen(false);
    setEditingBedId(null);
    setFormState({ bed_no: "", status: "AVAILABLE", room: "" });
    setFormError(null);
    setDialogPosition({ x: 0, y: 0 });
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
    if (!modalOpen) return;
    setDialogPosition({ x: 0, y: 0 });
  }, [modalOpen]);

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
    if (!modalOpen) return;
    const handleResize = () => {
      setDialogPosition((prev) => clampDialogPosition(prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampDialogPosition, modalOpen]);

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

  useEffect(() => {
    if (!shouldFocusBedNumberRef.current) return;
    shouldFocusBedNumberRef.current = false;
    if (bedNumberInputRef.current) {
      bedNumberInputRef.current.focus();
      const cursorPos = bedNumberInputRef.current.value.length;
      bedNumberInputRef.current.setSelectionRange(cursorPos, cursorPos);
    }
  }, [formState.bed_no]);

  const filteredBeds = roomFilter
    ? sortedBeds.filter((bed) => String(bed.room) === String(roomFilter))
    : [];

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
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold">Bed List</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Filter by Room
              </label>
              <select
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="">Select room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {formatRoomOptionLabel(room)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setRoomFilter("")}
                className="px-3 py-2 border rounded text-sm hover:bg-gray-100"
              >
                Clear
              </button>
            </div>

            <button
              onClick={handleOpenAddBed}
              // className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={isAccessRestricted}
              className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                isAccessRestricted
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-blue-700"
              }`}
            >
              + Add Bed
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {!roomFilter ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-600">
          Please select a room to view beds.
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-visible rounded-lg bg-white shadow">
          <table className="w-full text-left border border-gray-200">
            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Bed #</th>
                <th className="px-4 py-2 border">Room / Ward</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-2 py-1 border text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBeds.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-4 text-gray-500 border"
                  >
                    No beds available for the selected room
                  </td>
                </tr>
              ) : (
                filteredBeds.map((bed, index) => {
                  const wardLabel = formatBedWardLabel(bed);
                  return (
                    <tr key={bed.id} className="border-t">
                      <td className="px-4 py-2 border">{index + 1}</td>
                      <td className="px-4 py-2 border">{getBedLabel(bed)}</td>
                      <td className="px-4 py-2 border">
                        {bed.room_no ? (
                          <span className="font-semibold">
                            {bed.room_no}
                            {wardLabel ? (
                              <span className="block text-sm font-normal text-gray-500">
                                {wardLabel}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          "Not Assigned"
                        )}
                      </td>
                      <td className="px-4 py-2 border">{bed.status || "—"}</td>
                      <td className="px-2 py-1 border text-center">
                        <ActionMenu
                          buttonLabel="Bed actions"
                          disabled={isAccessRestricted}
                          items={[
                            {
                              label: "Edit",
                              onClick: () => handleEditBed(bed),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div
            ref={dialogRef}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
            style={{
              transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
            }}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-semibold">
                {editingBedId ? "Edit Bed" : "Add Bed"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={handleDialogDragStart}
                  className="cursor-grab rounded-full border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  aria-label="Drag dialog"
                >
                  <GripVertical size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-full border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {formError &&
              formError !== DUPLICATE_BED_ERROR &&
              formError !== BED_SUFFIX_REQUIRED_ERROR && (
              <p className="text-red-600 text-sm mb-2">{formError}</p>
            )}

            <form onSubmit={handleCreateBed} className="space-y-4">
              <div>
                <label className="block font-medium">Assign Room</label>
                <select
                  name="room"
                  value={formState.room}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {formatRoomOptionLabel(room)}
                    </option>
                  ))}
                </select>
              </div>

              {/* BED NUMBER */}
              <div>
                <label className="block font-medium">Bed Number</label>
                <input
                  type="text"
                  name="bed_no"
                  value={formState.bed_no}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2 mt-1"
                  placeholder="Enter bed number"
                  ref={bedNumberInputRef}
                />
                {(formError === DUPLICATE_BED_ERROR ||
                  formError === BED_SUFFIX_REQUIRED_ERROR) && (
                  <p className="mt-1 text-sm text-red-600">{formError}</p>
                )}
              </div>

              {/* BED STATUS */}
              <div>
                <label className="block font-medium">Bed Status</label>
                <select
                  name="status"
                  value={formState.status}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="CLEANING">Cleaning</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingBedId
                      ? "Update Bed"
                      : "Add Bed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <SuccessDialog
        open={isSuccessDialogOpen}
        onClose={closeSuccessDialog}
        message={successMessage}
      />
      {/* </div> */}
    </div>
  );
}
