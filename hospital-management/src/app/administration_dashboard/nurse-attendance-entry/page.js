"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, MoreVertical, Sigma, CheckSquare, Text } from "lucide-react";

/* ------------------------------------------
   RAW DATA
------------------------------------------- */
const attendanceData = [
  {
    id: 1,
    name: "Melissa Smith",
    color: "bg-orange-200 text-orange-700",
    week: "11/23/2020",
    monIn: "08:00 AM",
    monOut: "03:00 PM",
    tueIn: "08:00 AM",
    tueOut: "07:00 PM",
    wedIn: "08:40 AM",
    wedOut: "05:30 PM",
    thuIn: "08:00 AM",
    thuOut: "05:30 PM",
    friIn: "08:30 AM",
    friOut: "06:30 PM",
    totalHours: 46,
    checked: true,
    remarks: "",
  },
  {
    id: 2,
    name: "Tonya Harris",
    color: "bg-green-200 text-green-700",
    week: "11/23/2020",
    monIn: "7:50 AM",
    monOut: "3:00 PM",
    tueIn: "7:40 AM",
    tueOut: "5:20 PM",
    wedIn: "9:00 AM",
    wedOut: "8:30 PM",
    thuIn: "6:50 AM",
    thuOut: "5:20 PM",
    friIn: "9:00 AM",
    friOut: "07:00 PM",
    totalHours: 50,
    checked: false,
    remarks: "",
  },
];

/* ------------------------------------------
   TIME NORMALIZER
------------------------------------------- */
const normalizeToTimeInput = (value) => {
  if (!value) return "";

  const trimmed = value.trim();
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (amPmMatch) {
    let [_, hours, minutes, period] = amPmMatch;
    let hourNum = parseInt(hours, 10);

    if (period.toUpperCase() === "PM" && hourNum !== 12) hourNum += 12;
    if (period.toUpperCase() === "AM" && hourNum === 12) hourNum = 0;

    return `${String(hourNum).padStart(2, "0")}:${minutes}`;
  }

  const simpleMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (simpleMatch) {
    return `${String(parseInt(simpleMatch[1], 10)).padStart(2, "0")}:${
      simpleMatch[2]
    }`;
  }

  return "";
};

/* ------------------------------------------
   TIME PICKER INPUT
------------------------------------------- */
const TimePickerCell = ({ value, onChange }) => {
  const inputRef = useRef(null);

  const openPicker = () => {
    if (inputRef.current?.showPicker) inputRef.current.showPicker();
    else inputRef.current?.focus();
  };

  return (
    <div className="relative w-32">
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <Calendar size={14} className="text-gray-400" />
      </div>

      <input
        ref={inputRef}
        type="time"
        step="300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className="
          w-full appearance-none rounded-md border border-gray-300 bg-white
          pl-3 pr-8 py-1 text-xs font-medium text-gray-700 shadow-sm
          focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200
          [&::-webkit-calendar-picker-indicator]:opacity-0
        "
      />
    </div>
  );
};

/* ------------------------------------------
   MAIN PAGE
------------------------------------------- */
export default function AdministrationNurseAttendancePage() {
  const [rows, setRows] = useState([]);

  /* Normalize only after hydration */
  useEffect(() => {
    const normalizedRows = attendanceData.map((row) => {
      const fix = (v) => normalizeToTimeInput(v);
      return {
        ...row,
        monIn: fix(row.monIn),
        monOut: fix(row.monOut),
        tueIn: fix(row.tueIn),
        tueOut: fix(row.tueOut),
        wedIn: fix(row.wedIn),
        wedOut: fix(row.wedOut),
        thuIn: fix(row.thuIn),
        thuOut: fix(row.thuOut),
        friIn: fix(row.friIn),
        friOut: fix(row.friOut),
      };
    });

    setRows(normalizedRows);
  }, []);

  const handleRowChange = (rowIndex, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h1 className="text-xl font-semibold">Daily Attendance</h1>

        <div className="flex items-center gap-2">
          <input
            placeholder="Search Here..."
            className="px-3 py-2 border rounded-md text-sm w-64"
          />
          <button className="px-3 py-2 border rounded-md hover:bg-gray-100">
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto border rounded-lg shadow-sm">
        <table className="min-w-[2200px] text-sm relative">
          <thead className="bg-gray-100 border-b text-gray-700 sticky top-0 z-30">
            <tr>
              <th className="px-3 py-3 border-r whitespace-nowrap sticky left-0 bg-gray-100 z-40">
                #
              </th>

              <th className="px-3 py-3 border-r bg-gray-100 whitespace-nowrap">
                Name
              </th>

              <th className="px-3 py-3 border-r bg-gray-100 whitespace-nowrap">
                Week
              </th>

              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                (day) => (
                  <React.Fragment key={day}>
                    <th className="px-3 py-3 border-r bg-gray-100 whitespace-nowrap">
                      <div className="flex items-center justify-between whitespace-nowrap">
                        <Calendar size={14} />
                        <span>{day} In</span>
                        <MoreVertical size={14} />
                      </div>
                    </th>

                    <th className="px-3 py-3 border-r bg-gray-100 whitespace-nowrap">
                      <div className="flex items-center justify-between whitespace-nowrap">
                        <Calendar size={14} />
                        <span>{day} Out</span>
                        <MoreVertical size={14} />
                      </div>
                    </th>
                  </React.Fragment>
                )
              )}

              {/* TOTAL COLUMN FIX */}
              <th className="px-3 py-3 border-r bg-gray-100 whitespace-nowrap">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Sigma size={14} />
                  <span>Total Hours/Week</span>
                </div>
              </th>

              <th className="px-3 py-3 border-r bg-gray-100 whitespace-nowrap">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <CheckSquare size={14} />
                  <span>Checked</span>
                </div>
              </th>

              {/* REMARKS HEADER FIXED WIDTH */}
              <th className="px-3 py-3 bg-gray-100 whitespace-nowrap w-[300px]">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Text size={14} />
                  <span>Remarks</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-3 border-r sticky left-0 bg-white whitespace-nowrap">
                  {index + 1}
                </td>

                <td className="px-3 py-3 border-r whitespace-nowrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${row.color}`}
                  >
                    {row.name}
                  </span>
                </td>

                <td className="px-3 py-3 border-r whitespace-nowrap">
                  {row.week}
                </td>

                {[
                  { inField: "monIn", outField: "monOut" },
                  { inField: "tueIn", outField: "tueOut" },
                  { inField: "wedIn", outField: "wedOut" },
                  { inField: "thuIn", outField: "thuOut" },
                  { inField: "friIn", outField: "friOut" },
                ].map(({ inField, outField }) => (
                  <React.Fragment key={inField}>
                    <td className="px-3 py-3 border-r">
                      <TimePickerCell
                        value={row[inField]}
                        onChange={(val) => handleRowChange(index, inField, val)}
                      />
                    </td>

                    <td className="px-3 py-3 border-r">
                      <TimePickerCell
                        value={row[outField]}
                        onChange={(val) =>
                          handleRowChange(index, outField, val)
                        }
                      />
                    </td>
                  </React.Fragment>
                ))}

                <td className="px-3 py-3 border-r whitespace-nowrap">
                  {row.totalHours}
                </td>

                <td className="px-3 py-3 border-r whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={(e) =>
                      handleRowChange(index, "checked", e.target.checked)
                    }
                  />
                </td>

                {/* REMARKS CELL - WIDER & BIGGER INPUT */}
                <td className="px-3 py-3 whitespace-nowrap w-[300px]">
                  <input
                    type="text"
                    className="px-3 py-2 w-full border rounded-md text-sm h-10"
                    value={row.remarks}
                    onChange={(e) =>
                      handleRowChange(index, "remarks", e.target.value)
                    }
                    placeholder="Type remarks..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
