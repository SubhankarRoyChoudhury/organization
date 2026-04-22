"use client";
import React from "react";
import { useState } from "react";
import { Calendar, MoreVertical, Sigma, CheckSquare, Text } from "lucide-react";

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
  {
    id: 3,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 4,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 5,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 6,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 7,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 8,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 9,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 10,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 11,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 12,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 13,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 14,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 15,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 16,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 17,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 18,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 19,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 20,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 21,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
  {
    id: 22,
    name: "Holly Walker",
    color: "bg-blue-200 text-blue-700",
    week: "10/12/2020",
    monIn: "8:30 AM",
    monOut: "3:30 PM",
    tueIn: "9:00 AM",
    tueOut: "8:00 PM",
    wedIn: "6:00 PM",
    wedOut: "8:00 PM",
    thuIn: "8:50 AM",
    thuOut: "4:40 PM",
    friIn: "8:40 AM",
    friOut: "08:00 PM",
    totalHours: 48,
    checked: true,
    remarks: "",
  },
];

export default function NurseAttendancePage() {
  const [rows, setRows] = useState(attendanceData);

  return (
    <div className="h-full flex flex-col p-4">
      {/* HEADER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-center mb-4 gap-3">
        {/* Title */}
        <h1 className="text-xl font-semibold">Daily Attendance</h1>

        {/* Search + Filter always same row */}
        <div className="flex items-center gap-2 justify-start md:justify-end w-full">
          <input
            placeholder="Search"
            className="px-3 py-2 border rounded-md text-sm flex-1 md:w-64"
          />

          <button className="px-3 py-2 border rounded-md hover:bg-gray-100 whitespace-nowrap">
            Filter
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 min-h-0 overflow-auto border rounded-lg shadow-sm">
        <table className="min-w-[2000px] text-sm relative">
          <thead className="bg-gray-100 border-b text-gray-700 sticky top-0 z-30">
            <tr>
              <th className="px-3 py-3 border-r whitespace-nowrap sticky left-0 top-0 bg-gray-100 z-40">
                #
              </th>
              <th className="px-3 py-3 border-r whitespace-nowrap sticky top-0 bg-gray-100 z-30">
                Name
              </th>
              <th className="px-3 py-3 border-r whitespace-nowrap sticky top-0 bg-gray-100 z-30">
                Week
              </th>

              {/* DAYS HEADER WITH ICONS + NO WRAP */}
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                (day) => (
                  <React.Fragment key={day}>
                    {/* IN COLUMN */}
                    <th className="px-3 py-3 border-r whitespace-nowrap sticky top-0 bg-gray-100 z-30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span className="ms-2 me-2">{day} In</span>
                        </div>
                        <MoreVertical size={14} className="opacity-60" />
                      </div>
                    </th>

                    {/* OUT COLUMN */}
                    <th className="px-3 py-3 border-r whitespace-nowrap sticky top-0 bg-gray-100 z-30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span className="ms-2 me-2">{day} Out</span>
                        </div>
                        <MoreVertical size={14} className="opacity-60" />
                      </div>
                    </th>
                  </React.Fragment>
                )
              )}

              {/* Total Hours */}
              <th className="px-3 py-3 border-r whitespace-nowrap sticky top-0 bg-gray-100 z-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Sigma size={14} />
                    <span>Total Hours/Week</span>
                  </div>
                  <MoreVertical size={14} className="opacity-60" />
                </div>
              </th>

              {/* Checked by Manager */}
              <th className="px-3 py-3 border-r whitespace-nowrap sticky top-0 bg-gray-100 z-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CheckSquare size={14} />
                    <span>Checked by Manager</span>
                  </div>
                  <MoreVertical size={14} className="opacity-60" />
                </div>
              </th>

              {/* Remarks */}
              <th className="px-3 py-3 whitespace-nowrap sticky top-0 bg-gray-100 z-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Text size={14} />
                    <span>Remarks</span>
                  </div>
                  <MoreVertical size={14} className="opacity-60" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-3 border-r sticky left-0 bg-white z-10">
                  {index + 1}
                </td>

                {/* NAME TAG */}
                <td className="px-3 py-3 border-r">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${row.color}`}
                  >
                    {row.name}
                  </span>
                </td>

                <td className="px-3 py-3 border-r">{row.week}</td>

                {/* DAYS ROW — FIXED KEYS */}
                {[
                  ["mon", row.monIn, row.monOut],
                  ["tue", row.tueIn, row.tueOut],
                  ["wed", row.wedIn, row.wedOut],
                  ["thu", row.thuIn, row.thuOut],
                  ["fri", row.friIn, row.friOut],
                ].map(([key, i, o]) => (
                  <React.Fragment key={key}>
                    <td className="px-3 py-3 border-r">{i}</td>
                    <td className="px-3 py-3 border-r">{o}</td>
                  </React.Fragment>
                ))}

                <td className="px-3 py-3 border-r">{row.totalHours}</td>

                {/* CHECKBOX */}
                <td className="px-3 py-3 border-r">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].checked = e.target.checked;
                      setRows(updated);
                    }}
                    className="h-4 w-4"
                  />
                </td>

                {/* REMARKS */}
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={row.remarks}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[index].remarks = e.target.value;
                      setRows(updated);
                    }}
                    className="px-2 py-1 w-full border rounded-md text-xs"
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
