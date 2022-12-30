"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const btnsCustomContainer = document.querySelector(".custom__btns");
const btnReset = document.querySelector(".btn--reset");
const btnEdit = document.querySelector(".workout__btn--edit");

///////////////////////////////////////
// Common class for both type
class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

///////////////////////////////////////
// Running class

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPase();
    this._setDescription();
  }

  calcPase() {
    //min/km
    this.pase = this.duration / this.distance;
    return this.pase;
  }
}

///////////////////////////////////////
// Cycling class
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

//////////////////////////////////
// The app architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];

  constructor() {
    //Get position
    this._getPosition();

    //Get local storage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

    ///////////////////////////////////
    ///// Custom buttons
    btnReset.addEventListener("click", this.reset);
  }

  //Getting the position
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position!");
        }
      );
    }
  }

  //Load the map
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  //Showing the form
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    //empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    setTimeout(() => {
      form.style.display = "grid";
    }, 1000);
    form.classList.add("hidden");
  }

  //Toggleing the elevation form
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _showCustomButtons() {
    if (!localStorage) return;
    btnsCustomContainer.classList.remove("hidden");
  }

  //Creating the workouts
  _newWorkout(e) {
    e.preventDefault();

    const validInput = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    //Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout is Running, create Running object
    if (type === "running") {
      const cadence = +inputCadence.value;

      //Check if the data is valid
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert("Input is not valid");
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout is Cycling, create Cycling object
    if (type === "cycling") {
      const elevation = +inputCadence.value;

      //Check if the data is valid
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert("Input is not valid");
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add the new object to the workout array
    this.#workouts.push(workout);

    // //Render workout on Map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);
    //Hide form + clear input fields

    /// Clearing the fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();

    //Showing the buttons
    if (btnsCustomContainer.classList.contains("hidden")) {
      this._showCustomButtons();
    }
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃" : "🚴"} ${workout.description}`
      )
      .openPopup();

    // Storing the markers
    this.#markers.push(marker);

    // Attaching the id with the marker
    marker.markID = workout.id;
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__btns">
            <button class="workout__btn workout__btn--edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="workout__btn workout__btn--delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃" : "🚴"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === "running")
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pase.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
      `;

    if (workout.type === "cycling")
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

    form.insertAdjacentHTML("afterend", html);

    const btnDelete = document.querySelector(".workout__btn--delete");

    btnDelete.addEventListener("click", this._deleteWorkout.bind(this));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl || e.target.closest(".workout__btns")) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workout", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workout"));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });

    //Showing the buttons
    this._showCustomButtons();
  }

  reset() {
    localStorage.removeItem("workout");
    location.reload();
  }

  _deleteWorkout(e) {
    // Find the clicked workout element and the index of the workout in the array
    const clickedId = e.target.closest(".workout").dataset.id;
    const index = this.#workouts.findIndex((ind) => ind.id === clickedId);

    // Remove the workout from the array
    this.#workouts.splice(index, 1);

    // Update the local storage with the new workouts array
    localStorage.setItem("workout", JSON.stringify(this.#workouts));

    // Check if the workouts array is empty
    if (this.#workouts.length === 0) {
      // If it's empty, remove the workouts from local storage and hide the buttons
      localStorage.removeItem("workout");
      btnsCustomContainer.classList.add("hidden");
    }

    // Remove the marker from the map
    this.#markers.find((work) => work.markID === clickedId).remove();

    // Remove the workout element from the page
    e.target.closest(".workout").remove();
  }
}

const app = new App();
