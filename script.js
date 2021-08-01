"use strict";

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const submitButton = document.querySelector(".glow-on-hover_submit");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const sidebar = document.querySelector(".sidebar");
const reset = document.querySelector(".glow-on-hover_reset");
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//Architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #markers = [];
  #curWorkout;
  #editMode = false;
  #workouts = [];
  constructor() {
    //Get user's position
    this._getPosition();
    //Get data from local storage
    this._getLocalStorage();
    //Attach event handlers
    submitButton.addEventListener("click", this._submitWorkout.bind(this));
    //form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    sidebar.addEventListener("click", this._clickHandler.bind(this));
  }
  _reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
  _getPosition() {
    // If we get location successfully the first function will terminated, if not the second function will be terminated
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("Could not get your position");
      }
    );
  }

  _loadMap(position) {
    //Getting coordinates
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel); //first variable is coordinates, second is zoom constant.

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      // style of map https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png (another style)
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    // // Marker pop-up
    L.marker(coords).addTo(this.#map).bindPopup("Your location").openPopup();
    //Adding an eventListener to map but using Leaflet
    //Handling clicks on map
    // this.#map.on("click", this._showForm.bind(this));
    if (!this.#editMode) this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE, work) {
    this.#mapEvent = mapE;
    console.log(mapE, work);
    //Rendering workout input form
    if ((form.classList.contains = "hidden")) form.classList.remove("hidden");
    inputDistance.focus();

    this._changeFormFields();

    if (work) {
      // show form for editing
      inputDistance.value = work.distance;
      inputDuration.value = work.duration;
      if (work.type === "running") {
        inputType.value = "running";
        inputCadence
          .closest(".form__row")
          .classList.remove("form__row--hidden");
        inputElevation.closest(".form__row").classList.add("form__row--hidden");
        inputCadence.value = work.cadence;
      } else {
        inputType.value = "cycling";
        inputCadence.closest(".form__row").classList.add("form__row--hidden");
        inputElevation
          .closest(".form__row")
          .classList.remove("form__row--hidden");
        inputElevation.value = work.elevationGain;
      }
    }
  }
  _changeFormFields() {
    if (inputType.value === "running") {
      inputType.value = "running";
      inputCadence.closest(".form__row").classList.remove("form__row--hidden");
      inputElevation.closest(".form__row").classList.add("form__row--hidden");
    } else {
      inputType.value = "cycling";
      inputCadence.closest(".form__row").classList.add("form__row--hidden");
      inputElevation
        .closest(".form__row")
        .classList.remove("form__row--hidden");
    }
  }
  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }
  _clickHandler(e) {
    // select edit or delete button
    const btnElement = e.target.closest(".workout__controls button");

    // select cur workout
    const workoutEl = e.target.closest(".workout");

    // select form
    const form = e.target.closest(".form");
    // select reset
    reset.addEventListener("click", this._reset);

    if (form) return;
    //select clicked workout from activity list
    if (workoutEl) {
      const workout = this.#workouts.find(
        work => work.id === workoutEl.dataset.id
      );
      this.#curWorkout = workout;
      if (btnElement) {
        // handle edit button
        if (btnElement.dataset.type === "edit") {
          this._editWorkout(workout, workoutEl);
          console.log("edit");
        } else {
          console.log("delete");
          // handle delete button
          this._deleteWorkout(workout, workoutEl);
        }
      } else {
        // set the view position
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
          animate: true,
          pan: {
            duration: 1,
          },
        });
      }
      // set local storage to all workouts
      this._setLocalStorage();
    }
  }
  _editWorkout(work, workoutEl) {
    // let _;
    const editCloseBtns = workoutEl.querySelector('[data-type="edit"]');

    // handle add classes, toggle form and buttons
    this._editWorkHelper(editCloseBtns, work, workoutEl);
  }
  _deleteWorkout(work, workoutEl) {
    // find index of workout
    const workElement = this.#workouts.indexOf(work);
    // delete workout from the list of workouts
    console.log(`${work} has been deleted`);
    this.#workouts.splice(workElement, 1);
    // remove UX workout from the list
    workoutEl.remove();
    // find the marker and remove
    const marker = this.#markers.find(
      mark => mark._leaflet_id === work.markerId
    );
    marker.remove();
  }
  _editWorkHelper(editCloseBtns, work, workoutEl) {
    let _;
    if (editCloseBtns.classList.contains("glow-on-hover_edit")) {
      this.#editMode = true;

      document.querySelectorAll(".workout").forEach(workout => {
        workout.classList.remove(
          "workout--running--active",
          "workout--cycling--active"
        );
      });
      this.#markers.forEach(mark => {
        mark._popup._container.classList.remove(
          "running-popup--active",
          "cycling-popup--active"
        );
        if (mark._leaflet_id === work.markerId) {
          mark._popup._container.classList.add(`${work.type}-popup--active`);
        }
      });
      workoutEl.classList.add(`workout--${work.type}--active`);
      this._showForm(_, work);
    } else {
      this.#editMode = false;
      document.querySelectorAll(".workout").forEach(workout => {
        workout.classList.remove(
          "workout--running--active",
          "workout--cycling--active"
        );
      });
      this.#markers.forEach(mark => {
        mark._popup._container.classList.remove(
          "running-popup--active",
          "cycling-popup--active"
        );
      });
      this._hideForm();
    }
  }
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkOut(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number(isFinite(inp)));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers");
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert("Inputs have to be positive numbers");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    //Marker

    // Render workout on list
    this._renderWorkout(workout);
    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250, //options of popup
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`, // Styling the popup with css
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(marker);
    workout.markerId = marker._leaflet_id;
  }
  _submitWorkout(e) {
    if (this.#editMode) {
      this._changeWorkout(this.#curWorkout, e);
    } else {
      this._newWorkOut(e);
    }
  }
  _changeWorkout(workout, e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => Number(inp) > 0);
    e.preventDefault();

    // Get data from form
    const type = workout.type;
    const dist = +inputDistance.value;
    const durat = +inputDuration.value;

    // Check if data is valid
    // If workout is running, create running object
    if (type === "running") {
      const caden = +inputCadence.value;
      if (!validInputs(dist, durat, caden) || !allPositive(dist, durat, caden))
        return alert("Inputs have to be a positive number!");
      // change workout data
      // prettier-ignore
      [workout.distance, workout.duration,workout.cadence] = [dist,durat,caden]
      console.log(workout);
    }
    if (type === "cycling") {
      const elevGain = +inputElevation.value;
      if (!validInputs(dist, durat, elevGain) || !allPositive(dist, durat))
        return alert("Inputs have to be a positive number!");
      // change workout data
      // prettier-ignore
      [workout.distance, workout.duration, workout.elevationGain] = [dist,durat,elevGain];
      console.log(workout);
    }
    this._renderWorkout(workout);
    this._hideForm();
    this.#editMode = false;
  }
  _renderWorkout(workout) {
    const curWorkEl = document.querySelector(`[data-id="${workout.id}"]`);
    const formList = document.querySelector(".form");
    console.log(workout.type, workout.id, workout.description, workout.pace);
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="workout__title--container">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__controls">
        <button class="glow-on-hover glow-on-hover_delete" data-type="delete">Delete</button>
        <button class="glow-on-hover glow-on-hover_edit" data-type="edit">Edit</button>
        </div>
        </div>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;
    if (workout.type === "running") {
      html += `
         <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }
    if (workout.type === "cycling") {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
    </li>
    `;
    }
    if (this.#editMode) {
      curWorkEl.outerHTML = html;
    } else {
      formList.insertAdjacentHTML("afterend", html);
    }
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
}

const app = new App();
