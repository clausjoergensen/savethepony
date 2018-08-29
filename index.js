'use strict'

/**
 * API Base URL.
 *
 * @private
 */
const BaseURL = 'https://ponychallenge.trustpilot.com/pony-challenge/maze'

/**
 * A maze using the Trustpilot 'Save the Pony' API from https://ponychallenge.trustpilot.com/
 *
 * @class
 * @public
 */
class Maze {
  /**
   * Constructs a new maze of a given size for a given Pony.
   *
   * @public
   * @constructor
   * @param {string} Pony One of the available ponies.
   * @param {number} width
   * @param {number} height
   */
  constructor (pony, width, height) {
    if (width < 15 || width > 25) {
      throw new Error('Invalid argument. Width must be between 15 and 25.')
    }

    if (height < 15 || height > 25) {
      throw new Error('Invalid argument. Width must be between 15 and 25.')
    }

    this._width = width
    this._height = height
    this._cheating = false

    let request = new Request(BaseURL, {
      method: 'POST',
      body: JSON.stringify({
        'maze-width': width,
        'maze-height': height,
        'maze-player-name': pony,
        'difficulty': 0
      }),
      headers: new Headers({ 'Content-Type': 'application/json' })
    })

    fetch(request)
      .then(response => { return response.json() })
      .then(json => { return json.maze_id })
      .then(mazeId => {
        this._mazeId = mazeId
        this.renderMaze()
      })
      .catch(error => {
        console.error(error)
      })
  }

  /**
   * Gets whether cheating is enabled.
   *
   * @public
   * @return {boolean} True if cheating is enabled; otherwise false.
   */
  get cheating () {
    return this._cheating
  }

  /**
   * Sets whether cheating is enabled.
   * Re-renders the maze if the value have changed
   *
   * @public
   * @param {boolean} value
   */
  set cheating (value) {
    let shouldRender = value !== this._cheating
    this._cheating = value
    if (shouldRender) {
      this.renderMaze()
    }
  }

  /**
   * Returns true if the Pony can move north (up)
   *
   * @private
   */
  canGoNorth () {
    return !this.data[this.pony].includes('north')
  }

  /**
   * Returns true if the Pony can move west (left)
   *
   * @private
   */
  canGoWest () {
    return !this.data[this.pony].includes('west')
  }

  /**
   * Returns true if the Pony can move south (down)
   *
   * @private
   */
  canGoSouth () {
    return !this.data[this.pony + this._width].includes('north')
  }

  /**
   * Returns true if the Pony can move east (right)
   *
   * @private
   */
  canGoEast () {
    return !this.data[this.pony + 1].includes('west')
  }

  /**
   * Listens for Arrow Keys (Up/Down/Left/Right) and sends a movement action
   * to the server if the movement is valid (i.e. not into a wall)
   *
   * @private
   * @param {KeyboardEvent} event
   */
  keydown (event) {
    if (this.completed) {
      return
    }

    let direction = ''

    if (event.keyCode === 37 && this.canGoWest()) { // Left
      direction = 'west'
    } else if (event.keyCode === 38 && this.canGoNorth()) { // Up
      direction = 'north'
    } else if (event.keyCode === 39 && this.canGoEast()) { // Right
      direction = 'east'
    } else if (event.keyCode === 40 && this.canGoSouth()) { // Down
      direction = 'south'
    } else {
      return
    }

    let request = new Request(`${BaseURL}/${this._mazeId}`, {
      method: 'POST',
      body: JSON.stringify({
        direction: direction
      }),
      headers: new Headers({ 'Content-Type': 'application/json' })
    })

    fetch(request)
      .then(response => {
        this.renderMaze()
      })
      .catch(error => {
        console.error(error)
      })
  }

  /**
   * Creates the <table /> element containing the maze, and the maze structure
   *
   * @private
   */
  createMaze () {
    let cellSize = 40
    let index = 0

    this.table = document.createElement('table')
    this.table.classList.add('game')
    this.table.cellSpacing = '0'
    this.table.style.width = this._width * cellSize
    this.table.style.height = this._height * cellSize

    for (let row = 1; row <= this._height; row++) {
      let tr = this.table.insertRow(-1)

      for (let column = 1; column <= this._width; column++) {
        let td = tr.insertCell(-1)

        if (this.data[index].indexOf('west') !== -1) {
          td.classList.add('westWall')
        }

        if (this.data[index].indexOf('north') !== -1) {
          td.classList.add('northWall')
        }

        if (index === this.pony) {
          td.classList.add('pony')
        }

        if (index === this.domokun) {
          td.classList.add('domokun')
        }

        if (index === this.endPoint) {
          td.classList.add('endPoint')
        }

        index++
      }
    }

    let container = document.createElement('div')
    container.appendChild(this.table)

    document.body.appendChild(container)
    document.addEventListener('keydown', this.keydown.bind(this))
  }

  /**
   * Updates the position of the Pony and Dōmo-kun in the maze.
   *
   * @private
   */
  updateMaze () {
    let index = 0

    for (let row = 1; row <= this._height; row++) {
      let tr = this.table.rows[row - 1]

      for (let column = 1; column <= this._width; column++) {
        let td = tr.cells[column - 1]

        if (index === this.pony) {
          td.classList.remove('path')
          td.classList.add('pony')
        } else {
          td.classList.remove('pony')
        }

        if (index === this.domokun) {
          td.classList.remove('pony')
          td.classList.remove('path')
          td.classList.add('domokun')
        } else {
          td.classList.remove('domokun')
        }

        index++
      }
    }
  }

  /**
   * Renders a success or failure message to the user upon completion.
   *
   * @private
   */
  mazeCompleted (succeeded) {
    this.completed = true
    let animationId = 0
    animationId = setInterval(() => {
      if (!this.table.style.opacity) {
        this.table.style.opacity = 1
      }
      if (this.table.style.opacity > 0) {
        this.table.style.opacity -= 0.1
      } else {
        clearInterval(animationId)

        let label = document.createElement('label')
        label.id = 'game-result'
        label.innerText = succeeded
          ? 'Hurrah, Your pony escaped unharmed!'
          : 'Your pony got eaten by Dōmo-kun :-('

        this.table.parentElement.appendChild(label)
      }
    }, 40)
  }

  /**
   * Requests the maze data, and renders the maze with the latest position of Dōmo-kun.
   * Also creates the maze initially if necessary.
   *
   * @private
   */
  renderMaze () {
    if (!this._mazeId) {
      return
    }

    let request = new Request(`${BaseURL}/${this._mazeId}`, {
      method: 'GET',
      headers: new Headers({ 'Content-Type': 'application/json' })
    })

    fetch(request)
      .then(response => { return response.json() })
      .then(json => {
        this.pony = parseInt(json.pony)
        this.domokun = parseInt(json.domokun)
        this.endPoint = parseInt(json['end-point'])
        this.data = json.data

        if (this.pony === this.endPoint) {
          this.mazeCompleted(true)
        } else if (this.pony === this.domokun) {
          this.mazeCompleted(false)
        }

        if (this.table) {
          this.updateMaze()
        } else {
          this.createMaze()
        }

        if (this.cheating) {
          this.solveMaze()
        } else {
          this.unsolveMaze()
        }
      })
      .catch(error => {
        console.error(error)
      })
  }

  /**
   * Solves the maze using a breadth-first search,
   * annotating the found path with the CSS class 'path'
   *
   * @private
   */
  solveMaze () {
    /**
     * Breadth-first search implementation to solve the maze.
     */
    let solve = (index, end) => {
      let start = { 'idx': index, 'parent': null }
      let queue = []
      queue.push(start)

      let visisted = []
      visisted.push(index)

      while (queue.length !== 0) {
        let node = queue.shift()
        // If we reach the end, stop the search.
        if (node.idx === this.endPoint) {
          return node
        }
        // See if we can go west (left)
        if (!this.data[node.idx].includes('west') && !visisted.includes(node.idx - 1)) {
          visisted.push(node.idx - 1)
          queue.push({ 'idx': node.idx - 1, 'parent': node })
        }
        // See if we can go east (right)
        if (this.data[node.idx + 1] !== undefined && !this.data[node.idx + 1].includes('west') && !visisted.includes(node.idx + 1)) {
          visisted.push(node.idx + 1)
          queue.push({ 'idx': node.idx + 1, 'parent': node })
        }
        // See if we can move south (down)
        if (this.data[node.idx + this._width] !== undefined && !this.data[node.idx + this._width].includes('north') && !visisted.includes(node.idx + this._width)) {
          visisted.push(node.idx + this._width)
          queue.push({ 'idx': node.idx + this._width, 'parent': node })
        }
        // See if we can move north (up)
        if (!this.data[node.idx].includes('north') && !visisted.includes(node.idx - this._width)) {
          visisted.push(node.idx - this._width)
          queue.push({ 'idx': node.idx - this._width, 'parent': node })
        }
      }
    }

    // Unwind the found path
    let path = []
    let node = solve(this.pony, this.endPoint)
    while ((node = node.parent) != null) {
      if (node.idx !== this.pony && node.idx !== this.endPoint) {
        path.push(node.idx)
      }
    }

    // Render the unwinded path.
    let index = 0
    for (let row = 1; row <= this._height; row++) {
      let tr = this.table.rows[row - 1]

      for (let column = 1; column <= this._width; column++) {
        let td = tr.cells[column - 1]

        if (path.includes(index) && index !== this.domokun) {
          td.classList.add('path')
        }

        index++
      }
    }
  }

  /**
   * 'Unsolves' the maze by removing the CSS 'path' class.
   *
   * @private
   */
  unsolveMaze () {
    for (let row = 0; row < this.table.rows.length; row++) {
      let tr = this.table.rows[row]
      for (let column = 0; column < tr.cells.length; column++) {
        let td = tr.cells[column]
        td.classList.remove('path')
      }
    }
  }
}

// - Start the Game -

let maze = null // eslint-disable-line no-unused-vars

document.addEventListener('DOMContentLoaded', e => {
  let toggleCheatingCheckbox = document.getElementById('enable-cheating')
  toggleCheatingCheckbox.checked = window.sessionStorage.getItem('enable-cheating') === 'true'
  toggleCheatingCheckbox.addEventListener('click', e => {
    window.sessionStorage.setItem('enable-cheating', toggleCheatingCheckbox.checked)
    maze.cheating = toggleCheatingCheckbox.checked
  })

  let Pony = {
    TwilightSparke: 'Twilight Sparkle',
    Spike: 'Spike',
    RainbowDash: 'Rainbow Dash',
    PinkiePie: 'Pinkie Pie',
    Applejack: 'Applejack',
    Rarity: 'Rarity',
    Fluttershy: 'Fluttershy'
  }

  maze = new Maze(Pony.TwilightSparke, 15, 15)
  maze.cheating = toggleCheatingCheckbox.checked
})
