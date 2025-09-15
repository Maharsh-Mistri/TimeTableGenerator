document.addEventListener("DOMContentLoaded", function () {

  const coursesList = document.getElementById("courses-list");
  const addCourseBtn = document.getElementById("add-course");
  const generateBtn = document.getElementById("generate-btn");
  const timetableContainer = document.getElementById("timetable-container");
  const saveConfigBtn = document.getElementById("save-config");
  const loadConfigBtn = document.getElementById("load-config");
  const viewOptions = document.getElementById("view-options");
  const viewCompleteBtn = document.getElementById("view-complete");
  const viewDivisionBtn = document.getElementById("view-division");
  const viewFacultyBtn = document.getElementById("view-faculty");
  const viewRoomBtn = document.getElementById("view-room");
  const filterOptions = document.getElementById("filter-options");

  let courseCounter = 0;
  let currentTimetableData = null;
  let currentView = "complete";
  let currentFilter = null;

  // Add course button click handler
  addCourseBtn.addEventListener("click", addCourseForm);

  // Generate timetable button click handler
  generateBtn.addEventListener("click", generateTimetable);

  // Save/Load configuration handlers
  saveConfigBtn.addEventListener("click", saveConfiguration);
  loadConfigBtn.addEventListener("click", loadConfiguration);

  // View option handlers
  viewCompleteBtn.addEventListener("click", () => changeView("complete"));
  viewDivisionBtn.addEventListener("click", () => changeView("division"));
  viewFacultyBtn.addEventListener("click", () => changeView("faculty"));
  viewRoomBtn.addEventListener("click", () => changeView("room"));

  // Function to add a new course form
  function addCourseForm() {
    courseCounter++;
    const courseId = "course-" + courseCounter;

    const courseItem = document.createElement("div");
    courseItem.className = "course-item";
    courseItem.id = courseId;

    courseItem.innerHTML = `
            <div class="course-header">
                <h4>Course ${courseCounter}</h4>
                <button class="remove-course" data-course-id="${courseId}">Remove</button>
            </div>
            <div class="form-group">
                <label for="${courseId}-code">Course Code:</label>
                <input type="text" id="${courseId}-code" required>
            </div>
            <div class="form-group">
                <label for="${courseId}-name">Course Name:</label>
                <input type="text" id="${courseId}-name" required>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="${courseId}-has-lab"> Includes Lab
                </label>
            </div>
            <div class="form-group">
                <label for="${courseId}-faculties">Faculties (comma separated):</label>
                <input type="text" id="${courseId}-faculties" placeholder="e.g., MK,MB,MC" required>
            </div>
            <div class="form-group">
                <label for="${courseId}-duration">Preferred Duration (hours):</label>
                <select id="${courseId}-duration">
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                </select>
            </div>
        `;

    coursesList.appendChild(courseItem);

    // Add event listener to the remove button
    courseItem
      .querySelector(".remove-course")
      .addEventListener("click", function () {
        coursesList.removeChild(courseItem);
      });
  }

  // Function to generate the timetable
  function generateTimetable() {
    // Get basic inputs
    const semester = document.getElementById("semester").value;
    const numDivisions = parseInt(document.getElementById("divisions").value);
    const numRooms = parseInt(document.getElementById("rooms").value);

    // Validate inputs
    if (isNaN(numDivisions) || numDivisions < 1) {
      alert("Please enter a valid number of divisions (at least 1)");
      return;
    }

    if (isNaN(numRooms) || numRooms < 1) {
      alert("Please enter a valid number of rooms (at least 1)");
      return;
    }

    // Collect all courses
    const courseItems = document.querySelectorAll(".course-item");
    if (courseItems.length === 0) {
      alert("Please add at least one course");
      return;
    }

    const courses = [];
    courseItems.forEach((item) => {
      const id = item.id;
      const facultiesInput = document.getElementById(`${id}-faculties`).value;

      courses.push({
        id: id,
        code: document.getElementById(`${id}-code`).value,
        name: document.getElementById(`${id}-name`).value,
        hasLab: document.getElementById(`${id}-has-lab`).checked,
        faculties: facultiesInput
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f !== ""),
        duration: parseInt(document.getElementById(`${id}-duration`).value),
      });
    });

    // Validate courses
    for (const course of courses) {
      if (!course.code || !course.name) {
        alert(
          `Please enter code and name for ${course.code || "unnamed course"}`
        );
        return;
      }
      if (course.faculties.length === 0) {
        alert(`Please enter at least one faculty for ${course.code}`);
        return;
      }
    }

    // Generate timetable data structure
    currentTimetableData = createTimetable(courses, numDivisions, numRooms);

    // Show view options
    viewOptions.style.display = "block";

    // Display the timetable
    displayTimetable(currentTimetableData, numDivisions);

    // Add export button
    addExportButton();

    // Update filter options
    updateFilterOptions();
  }

  // Create timetable data structure
  function createTimetable(courses, numDivisions, numRooms) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const timeSlots = [
      "9:00-10:00",
      "10:00-11:00",
      "11:00-12:00",
      "12:00-13:00",
      "13:00-14:00",
      "14:00-15:00",
      "15:00-16:00",
      "16:00-17:00",
      "17:00-18:00",
    ];

    // Initialize timetable structure
    const timetable = {};
    days.forEach((day) => {
      timetable[day] = {};
      timeSlots.forEach((time) => {
        timetable[day][time] = {
          rooms: Array(numRooms).fill(null),
          faculties: new Set(),
          divisions: new Set(),
          labBatches: new Set(),
        };
      });
    });

    // Generate room names
    const rooms = Array.from({ length: numRooms }, (_, i) => `Room ${i + 1}`);

    // Generate division names (A, B, C, etc.)
    const divisions = Array.from({ length: numDivisions }, (_, i) =>
      String.fromCharCode(65 + i)
    );

    // Generate lab batch names (A1, A2, etc.)
    const labBatches = [];
    divisions.forEach((div) => {
      for (let i = 1; i <= 4; i++) {
        labBatches.push(`${div}${i}`);
      }
    });

    // 1. First schedule all labs (they're harder to place)
    const labCourses = courses.filter((course) => course.hasLab);
    for (const course of labCourses) {
      for (const batch of labBatches) {
        scheduleLab(course, batch, timetable, days, timeSlots, rooms);
      }
    }

    // 2. Then schedule lectures (3 per course per division)
    for (const course of courses) {
      for (const division of divisions) {
        let lecturesScheduled = 0;
        while (lecturesScheduled < 3) {
          if (
            scheduleLecture(course, division, timetable, days, timeSlots, rooms)
          ) {
            lecturesScheduled++;
          } else {
            console.warn(
              `Could only schedule ${lecturesScheduled} lectures for ${course.code} - Div ${division}`
            );
            break;
          }
        }
      }
    }

    return {
      timetable: timetable,
      days: days,
      timeSlots: timeSlots,
      rooms: rooms,
      divisions: divisions,
      labBatches: labBatches,
      courses: courses,
    };
  }

  // Schedule a lab session (2 consecutive hours)
  function scheduleLab(course, batch, timetable, days, timeSlots, rooms) {
    // Try each faculty until we find one that can be scheduled
    for (const faculty of course.faculties) {
      // Try each day
      for (const day of days) {
        // Try each time slot (except last one)
        for (let i = 0; i < timeSlots.length - 1; i++) {
          const time1 = timeSlots[i];
          const time2 = timeSlots[i + 1];
          const slot1 = timetable[day][time1];
          const slot2 = timetable[day][time2];

          // Check if faculty is available in both slots
          if (slot1.faculties.has(faculty) || slot2.faculties.has(faculty)) {
            continue;
          }

          // Check if lab batch is available in both slots
          if (slot1.labBatches.has(batch) || slot2.labBatches.has(batch)) {
            continue;
          }

          // Find available room in both slots
          for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
            if (
              slot1.rooms[roomIndex] === null &&
              slot2.rooms[roomIndex] === null
            ) {
              // Schedule the lab
              const labEntry = {
                course: course.code,
                name: course.name,
                faculty: faculty,
                division: batch[0], // Main division (A from A1)
                batch: batch,
                type: "LAB",
              };

              slot1.rooms[roomIndex] = labEntry;
              slot2.rooms[roomIndex] = labEntry;
              slot1.faculties.add(faculty);
              slot2.faculties.add(faculty);
              slot1.labBatches.add(batch);
              slot2.labBatches.add(batch);

              return true;
            }
          }
        }
      }
    }

    console.warn(`Failed to schedule lab for ${course.code} - Batch ${batch}`);
    return false;
  }

  // Schedule a lecture (1 hour)
  function scheduleLecture(
    course,
    division,
    timetable,
    days,
    timeSlots,
    rooms
  ) {
    // Try each faculty until we find one that can be scheduled
    for (const faculty of course.faculties) {
      // Try each day in random order to distribute evenly
      const shuffledDays = [...days].sort(() => Math.random() - 0.5);

      for (const day of shuffledDays) {
        // Try each time slot in random order
        const shuffledSlots = [...timeSlots].sort(() => Math.random() - 0.5);

        for (const time of shuffledSlots) {
          const slot = timetable[day][time];

          // Check if faculty is available
          if (slot.faculties.has(faculty)) {
            continue;
          }

          // Check if division is available
          if (slot.divisions.has(division)) {
            continue;
          }

          // Find first available room
          for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
            if (slot.rooms[roomIndex] === null) {
              // Schedule the lecture
              slot.rooms[roomIndex] = {
                course: course.code,
                name: course.name,
                faculty: faculty,
                division: division,
                type: "LECTURE",
              };
              slot.faculties.add(faculty);
              slot.divisions.add(division);

              return true;
            }
          }
        }
      }
    }

    return false;
  }

  // Display the timetable
  function displayTimetable(data, numDivisions, filter = null) {
    const { timetable, days, timeSlots, rooms, courses } = data;

    // Clear previous timetable
    timetableContainer.innerHTML = "";

    // Create timetable header
    const header = document.createElement("h2");
    header.textContent =
      "Generated Timetable - " + getViewTitle(currentView, filter);
    timetableContainer.appendChild(header);

    // Create info section
    const infoDiv = document.createElement("div");
    infoDiv.className = "timetable-info";
    infoDiv.innerHTML = `
            <p><strong>Semester:</strong> ${
              document.getElementById("semester").value
            }</p>
            <p><strong>Divisions:</strong> ${numDivisions} (${data.divisions.join(
      ", "
    )})</p>
            <p><strong>Lab Batches:</strong> ${data.labBatches.join(", ")}</p>
            <p><strong>Rooms:</strong> ${rooms.join(", ")}</p>
            <p><strong>Courses:</strong> ${courses
              .map((c) => `${c.code} (${c.name})`)
              .join(", ")}</p>
        `;
    timetableContainer.appendChild(infoDiv);

    // Create legend
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = `
            <div class="legend-item">
                <div class="legend-color lecture"></div>
                <span>Lecture</span>
            </div>
            <div class="legend-item">
                <div class="legend-color lab"></div>
                <span>Lab</span>
            </div>
            <div class="legend-item">
                <div class="legend-color empty-slot"></div>
                <span>Free Slot</span>
            </div>
        `;
    timetableContainer.appendChild(legend);

    // Create timetable table based on view
    if (currentView === "complete") {
      createCompleteTimetable(data);
    } else if (currentView === "division") {
      createDivisionTimetable(data, filter);
    } else if (currentView === "faculty") {
      createFacultyTimetable(data, filter);
    } else if (currentView === "room") {
      createRoomTimetable(data, filter);
    }

    // Add export button
    addExportButton();
  }

  // Create complete timetable view
  function createCompleteTimetable(data) {
    const { timetable, days, timeSlots, rooms } = data;
    const table = document.createElement("table");
    table.className = "timetable";

    // Create table header
    const thead = document.createElement("thead");
    let headerRow = document.createElement("tr");

    // Time column
    const timeHeader = document.createElement("th");
    timeHeader.textContent = "Time";
    headerRow.appendChild(timeHeader);

    // Day columns
    days.forEach((day) => {
      const dayHeader = document.createElement("th");
      dayHeader.textContent = day;
      dayHeader.colSpan = rooms.length;
      dayHeader.className = "day-header";
      headerRow.appendChild(dayHeader);
    });

    thead.appendChild(headerRow);

    // Room sub-header row
    headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th")); // Empty time cell

    days.forEach(() => {
      rooms.forEach((room) => {
        const roomHeader = document.createElement("th");
        roomHeader.textContent = room;
        headerRow.appendChild(roomHeader);
      });
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement("tbody");

    // Add time slots
    timeSlots.forEach((time) => {
      const row = document.createElement("tr");

      // Time cell
      const timeCell = document.createElement("td");
      timeCell.textContent = time;
      timeCell.className = "time-slot";
      row.appendChild(timeCell);

      // Day cells
      days.forEach((day) => {
        const slot = timetable[day][time];

        // Room cells for this day/time
        slot.rooms.forEach((room, index) => {
          const cell = document.createElement("td");

          if (room) {
            cell.className = room.type === "LAB" ? "lab" : "lecture";

            const content = document.createElement("div");
            let displayText = `<div class="course-code">${room.course}</div>`;

            if (room.type === "LAB") {
              displayText += `<div class="course-faculty">${room.faculty} - ${room.batch}</div>`;
            } else {
              displayText += `<div class="course-faculty">${room.faculty} - Div ${room.division}</div>`;
            }

            displayText += `<div class="course-type">${room.type}</div>`;
            content.innerHTML = displayText;
            cell.appendChild(content);
          }

          row.appendChild(cell);
        });
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    timetableContainer.appendChild(table);
  }

  // Create division-wise timetable view
  function createDivisionTimetable(data, division) {
    const { timetable, days, timeSlots, rooms } = data;
    const table = document.createElement("table");
    table.className = "timetable";

    // Create table header
    const thead = document.createElement("thead");
    let headerRow = document.createElement("tr");

    // Time column
    const timeHeader = document.createElement("th");
    timeHeader.textContent = "Time";
    headerRow.appendChild(timeHeader);

    // Day columns
    days.forEach((day) => {
      const dayHeader = document.createElement("th");
      dayHeader.textContent = day;
      dayHeader.className = "day-header";
      headerRow.appendChild(dayHeader);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement("tbody");

    // Add time slots
    timeSlots.forEach((time) => {
      const row = document.createElement("tr");

      // Time cell
      const timeCell = document.createElement("td");
      timeCell.textContent = time;
      timeCell.className = "time-slot";
      row.appendChild(timeCell);

      // Day cells
      days.forEach((day) => {
        const slot = timetable[day][time];
        const cell = document.createElement("td");

        // Find all classes for this division
        const divisionClasses = [];
        const labBatches = [];

        // Check for lectures
        slot.rooms.forEach((room) => {
          if (
            room &&
            (room.division === division ||
              (room.type === "LAB" && room.batch.startsWith(division)))
          ) {
            divisionClasses.push(room);
          }
        });

        if (divisionClasses.length > 0) {
          const content = document.createElement("div");
          let displayText = "";

          divisionClasses.forEach((cls) => {
            displayText += `<div class="course-code">${cls.course}</div>`;
            if (cls.type === "LAB") {
              displayText += `<div class="course-faculty">${cls.faculty} - ${cls.batch}</div>`;
            } else {
              displayText += `<div class="course-faculty">${cls.faculty}</div>`;
            }
            displayText += `<div class="course-type">${cls.type} - ${
              cls.type === "LAB" ? "" : "Room " + rooms[slot.rooms.indexOf(cls)]
            }</div><hr>`;
          });

          content.innerHTML = displayText;
          cell.appendChild(content);
          cell.className =
            divisionClasses[0].type === "LAB" ? "lab" : "lecture";
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    timetableContainer.appendChild(table);
  }

  // Create faculty-wise timetable view
  function createFacultyTimetable(data, faculty) {
    const { timetable, days, timeSlots, rooms } = data;
    const table = document.createElement("table");
    table.className = "timetable";

    // Create table header
    const thead = document.createElement("thead");
    let headerRow = document.createElement("tr");

    // Time column
    const timeHeader = document.createElement("th");
    timeHeader.textContent = "Time";
    headerRow.appendChild(timeHeader);

    // Day columns
    days.forEach((day) => {
      const dayHeader = document.createElement("th");
      dayHeader.textContent = day;
      dayHeader.className = "day-header";
      headerRow.appendChild(dayHeader);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement("tbody");

    // Add time slots
    timeSlots.forEach((time) => {
      const row = document.createElement("tr");

      // Time cell
      const timeCell = document.createElement("td");
      timeCell.textContent = time;
      timeCell.className = "time-slot";
      row.appendChild(timeCell);

      // Day cells
      days.forEach((day) => {
        const slot = timetable[day][time];
        const cell = document.createElement("td");

        // Find all classes for this faculty
        const facultyClasses = [];

        slot.rooms.forEach((room) => {
          if (room && room.faculty === faculty) {
            facultyClasses.push(room);
          }
        });

        if (facultyClasses.length > 0) {
          const content = document.createElement("div");
          let displayText = "";

          facultyClasses.forEach((cls) => {
            displayText += `<div class="course-code">${cls.course}</div>`;
            if (cls.type === "LAB") {
              displayText += `<div class="course-faculty">${cls.batch}</div>`;
            } else {
              displayText += `<div class="course-faculty">Div ${cls.division}</div>`;
            }
            displayText += `<div class="course-type">${cls.type} - Room ${
              rooms[slot.rooms.indexOf(cls)]
            }</div><hr>`;
          });

          content.innerHTML = displayText;
          cell.appendChild(content);
          cell.className = facultyClasses[0].type === "LAB" ? "lab" : "lecture";
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    timetableContainer.appendChild(table);
  }

  // Create room-wise timetable view
  function createRoomTimetable(data, room) {
    const { timetable, days, timeSlots, rooms } = data;
    const roomIndex = rooms.indexOf(room);
    const table = document.createElement("table");
    table.className = "timetable";

    // Create table header
    const thead = document.createElement("thead");
    let headerRow = document.createElement("tr");

    // Time column
    const timeHeader = document.createElement("th");
    timeHeader.textContent = "Time";
    headerRow.appendChild(timeHeader);

    // Day columns
    days.forEach((day) => {
      const dayHeader = document.createElement("th");
      dayHeader.textContent = day;
      dayHeader.className = "day-header";
      headerRow.appendChild(dayHeader);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement("tbody");

    // Add time slots
    timeSlots.forEach((time) => {
      const row = document.createElement("tr");

      // Time cell
      const timeCell = document.createElement("td");
      timeCell.textContent = time;
      timeCell.className = "time-slot";
      row.appendChild(timeCell);

      // Day cells
      days.forEach((day) => {
        const slot = timetable[day][time];
        const cell = document.createElement("td");

        const roomData = slot.rooms[roomIndex];

        if (roomData) {
          const content = document.createElement("div");
          let displayText = `<div class="course-code">${roomData.course}</div>`;

          if (roomData.type === "LAB") {
            displayText += `<div class="course-faculty">${roomData.faculty} - ${roomData.batch}</div>`;
          } else {
            displayText += `<div class="course-faculty">${roomData.faculty} - Div ${roomData.division}</div>`;
          }

          displayText += `<div class="course-type">${roomData.type}</div>`;
          content.innerHTML = displayText;
          cell.appendChild(content);
          cell.className = roomData.type === "LAB" ? "lab" : "lecture";
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    timetableContainer.appendChild(table);
  }

  // Change view mode
  function changeView(view) {
    currentView = view;

    // Update active button
    viewCompleteBtn.classList.remove("active");
    viewDivisionBtn.classList.remove("active");
    viewFacultyBtn.classList.remove("active");
    viewRoomBtn.classList.remove("active");

    if (view === "complete") {
      viewCompleteBtn.classList.add("active");
    } else if (view === "division") {
      viewDivisionBtn.classList.add("active");
    } else if (view === "faculty") {
      viewFacultyBtn.classList.add("active");
    } else if (view === "room") {
      viewRoomBtn.classList.add("active");
    }

    // Update filter options
    updateFilterOptions();

    // Redisplay timetable
    displayTimetable(
      currentTimetableData,
      document.getElementById("divisions").value,
      currentFilter
    );
  }

  // Update filter options based on current view
  function updateFilterOptions() {
    filterOptions.innerHTML = "";

    if (currentView === "complete") {
      return;
    }

    const label = document.createElement("label");
    label.textContent = getFilterLabel();
    filterOptions.appendChild(label);

    const select = document.createElement("select");
    select.id = "filter-select";

    let options = [];

    if (currentView === "division") {
      options = currentTimetableData.divisions;
    } else if (currentView === "faculty") {
      // Get all unique faculties
      const faculties = new Set();
      currentTimetableData.courses.forEach((course) => {
        course.faculties.forEach((f) => faculties.add(f));
      });
      options = Array.from(faculties);
    } else if (currentView === "room") {
      options = currentTimetableData.rooms;
    }

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });

    filterOptions.appendChild(select);

    select.addEventListener("change", () => {
      currentFilter = select.value;
      displayTimetable(
        currentTimetableData,
        document.getElementById("divisions").value,
        currentFilter
      );
    });

    // Set initial filter
    if (options.length > 0) {
      currentFilter = options[0];
      select.value = currentFilter;
    }
  }

  // Get filter label based on current view
  function getFilterLabel() {
    switch (currentView) {
      case "division":
        return "Select Division: ";
      case "faculty":
        return "Select Faculty: ";
      case "room":
        return "Select Room: ";
      default:
        return "";
    }
  }

  // Get view title
  function getViewTitle(view, filter) {
    switch (view) {
      case "complete":
        return "Complete View";
      case "division":
        return `Division ${filter}`;
      case "faculty":
        return `Faculty ${filter}`;
      case "room":
        return `Room ${filter}`;
      default:
        return "";
    }
  }

  // Save configuration function
  function saveConfiguration() {
    const config = {
      semester: document.getElementById("semester").value,
      divisions: document.getElementById("divisions").value,
      rooms: document.getElementById("rooms").value,
      courses: [],
    };

    document.querySelectorAll(".course-item").forEach((item) => {
      const id = item.id;
      config.courses.push({
        code: document.getElementById(`${id}-code`).value,
        name: document.getElementById(`${id}-name`).value,
        hasLab: document.getElementById(`${id}-has-lab`).checked,
        faculties: document.getElementById(`${id}-faculties`).value,
        duration: document.getElementById(`${id}-duration`).value,
      });
    });

    const configJson = JSON.stringify(config);
    localStorage.setItem("timetableConfig", configJson);
    alert("Configuration saved successfully!");
  }

  // Load configuration function
  function loadConfiguration() {
    const configJson = localStorage.getItem("timetableConfig");
    if (!configJson) {
      alert("No saved configuration found");
      return;
    }

    const config = JSON.parse(configJson);

    // Set basic fields
    document.getElementById("semester").value = config.semester;
    document.getElementById("divisions").value = config.divisions;
    document.getElementById("rooms").value = config.rooms;

    // Clear existing courses
    document.getElementById("courses-list").innerHTML = "";
    courseCounter = 0;

    // Add courses from config
    config.courses.forEach((course) => {
      addCourseForm();
      const id = "course-" + courseCounter;

      document.getElementById(`${id}-code`).value = course.code;
      document.getElementById(`${id}-name`).value = course.name;
      document.getElementById(`${id}-has-lab`).checked = course.hasLab;
      document.getElementById(`${id}-faculties`).value = course.faculties;
      document.getElementById(`${id}-duration`).value = course.duration || 1;
    });

    alert("Configuration loaded successfully!");
  }

  // Add export button
  function addExportButton() {
    // Remove existing export button if it exists
    const existingBtn = document.getElementById("export-pdf");
    if (existingBtn) {
      existingBtn.remove();
    }

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "Export to PDF";
    exportBtn.id = "export-pdf";
    exportBtn.style.backgroundColor = "#e74c3c";
    exportBtn.style.marginTop = "20px";
    exportBtn.addEventListener("click", exportToPDF);
    timetableContainer.appendChild(exportBtn);
  }

  // Export function using jsPDF
  function exportToPDF() {
    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
    });

    // Set document properties
    doc.setProperties({
      title: "Timetable - " + document.getElementById("semester").value,
      subject: "Generated Timetable",
      author: "Automated Timetable Generator",
    });

    // Add title
    doc.setFontSize(18);
    doc.text(
      "Generated Timetable - " + getViewTitle(currentView, currentFilter),
      105,
      15,
      { align: "center" }
    );

    // Add metadata
    doc.setFontSize(12);
    const infoDiv = document.querySelector(".timetable-info");
    const infoTexts = Array.from(infoDiv.querySelectorAll("p")).map(
      (p) => p.textContent
    );

    infoTexts.forEach((text, index) => {
      doc.text(text, 15, 25 + index * 5);
    });

    // Prepare data for the table based on current view
    const columns = [];
    const rows = [];

    if (currentView === "complete") {
      // Complete view export
      columns.push(
        { header: "Time", dataKey: "time" },
        { header: "Day", dataKey: "day" },
        { header: "Room", dataKey: "room" },
        { header: "Course", dataKey: "course" },
        { header: "Faculty", dataKey: "faculty" },
        { header: "Division/Batch", dataKey: "division" },
        { header: "Type", dataKey: "type" }
      );

      currentTimetableData.days.forEach((day) => {
        currentTimetableData.timeSlots.forEach((time) => {
          const slot = currentTimetableData.timetable[day][time];
          slot.rooms.forEach((room, roomIndex) => {
            if (room) {
              rows.push({
                time,
                day,
                room: currentTimetableData.rooms[roomIndex],
                course: room.course,
                faculty: room.faculty,
                division:
                  room.type === "LAB" ? room.batch : "Div " + room.division,
                type: room.type,
              });
            }
          });
        });
      });
    } else if (currentView === "division") {
      // Division view export
      columns.push(
        { header: "Time", dataKey: "time" },
        { header: "Day", dataKey: "day" },
        { header: "Course", dataKey: "course" },
        { header: "Faculty", dataKey: "faculty" },
        { header: "Type", dataKey: "type" },
        { header: "Room", dataKey: "room" }
      );

      currentTimetableData.days.forEach((day) => {
        currentTimetableData.timeSlots.forEach((time) => {
          const slot = currentTimetableData.timetable[day][time];
          const divisionClasses = [];

          // Find all classes for this division
          slot.rooms.forEach((room, roomIndex) => {
            if (
              room &&
              (room.division === currentFilter ||
                (room.type === "LAB" && room.batch.startsWith(currentFilter)))
            ) {
              divisionClasses.push({
                ...room,
                room: currentTimetableData.rooms[roomIndex],
              });
            }
          });

          divisionClasses.forEach((cls) => {
            rows.push({
              time,
              day,
              course: cls.course,
              faculty: cls.faculty,
              type: cls.type,
              room: cls.room,
            });
          });
        });
      });
    } else if (currentView === "faculty") {
      // Faculty view export
      columns.push(
        { header: "Time", dataKey: "time" },
        { header: "Day", dataKey: "day" },
        { header: "Course", dataKey: "course" },
        { header: "Division/Batch", dataKey: "division" },
        { header: "Type", dataKey: "type" },
        { header: "Room", dataKey: "room" }
      );

      currentTimetableData.days.forEach((day) => {
        currentTimetableData.timeSlots.forEach((time) => {
          const slot = currentTimetableData.timetable[day][time];
          const facultyClasses = [];

          // Find all classes for this faculty
          slot.rooms.forEach((room, roomIndex) => {
            if (room && room.faculty === currentFilter) {
              facultyClasses.push({
                ...room,
                room: currentTimetableData.rooms[roomIndex],
                division:
                  room.type === "LAB" ? room.batch : "Div " + room.division,
              });
            }
          });

          facultyClasses.forEach((cls) => {
            rows.push({
              time,
              day,
              course: cls.course,
              division: cls.division,
              type: cls.type,
              room: cls.room,
            });
          });
        });
      });
    } else if (currentView === "room") {
      // Room view export
      columns.push(
        { header: "Time", dataKey: "time" },
        { header: "Day", dataKey: "day" },
        { header: "Course", dataKey: "course" },
        { header: "Faculty", dataKey: "faculty" },
        { header: "Division/Batch", dataKey: "division" },
        { header: "Type", dataKey: "type" }
      );

      const roomIndex = currentTimetableData.rooms.indexOf(currentFilter);

      currentTimetableData.days.forEach((day) => {
        currentTimetableData.timeSlots.forEach((time) => {
          const slot = currentTimetableData.timetable[day][time];
          const roomData = slot.rooms[roomIndex];

          if (roomData) {
            rows.push({
              time,
              day,
              course: roomData.course,
              faculty: roomData.faculty,
              division:
                roomData.type === "LAB"
                  ? roomData.batch
                  : "Div " + roomData.division,
              type: roomData.type,
            });
          }
        });
      });
    }

    // Add the table to the PDF
    doc.autoTable({
      head: [columns.map((col) => col.header)],
      body: rows.map((row) => columns.map((col) => row[col.dataKey])),
      startY: 45,
      styles: {
        cellPadding: 2,
        fontSize: 8,
        valign: "middle",
      },
      didDrawCell: (data) => {
        // Color coding for cells
        if (data.column.dataKey === "type") {
          if (data.cell.raw === "LAB") {
            doc.setFillColor(253, 235, 208); // Lab color
            doc.rect(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              "F"
            );
          } else if (data.cell.raw === "LECTURE") {
            doc.setFillColor(213, 245, 227); // Lecture color
            doc.rect(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              "F"
            );
          }
        }
      },
    });

    // Save the PDF
    doc.save(
      `timetable_${document.getElementById("semester").value}_${currentView}_${
        currentFilter || "complete"
      }.pdf`
    );
  }

  // Add first course by default
  addCourseForm();
});
