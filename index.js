'use strict'

/* global fetch:false */
/* global Request:false */
/* global Headers:false */

class Maze {
  constructor (pony, width, height) {
    if (width < 15 || width > 25) {
      throw new Error('Invalid argument. Width must be between 15 and 25.')
    }

    if (height < 15 || height > 25) {
      throw new Error('Invalid argument. Width must be between 15 and 25.')
    }

    this._width = width
    this._height = height
    this._mazeId = ''
    this._cheating = false

    let request = new Request('https://ponychallenge.trustpilot.com/pony-challenge/maze', {
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

  get mazeId () {
    return this._mazeId
  }

  get cheating () {
    return this._cheating
  }

  set cheating (value) {
    let shouldRender = value !== this._cheating
    this._cheating = value
    if (shouldRender) {
      this.renderMaze()
    }
  }

  canGoNorth () {
    return !this.data[this.pony].includes('north')
  }

  canGoWest () {
    return !this.data[this.pony].includes('west')
  }

  canGoSouth () {
    return !this.data[this.pony + this._width].includes('north')
  }

  canGoEast () {
    return !this.data[this.pony + 1].includes('west')
  }

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

    let request = new Request(`https://ponychallenge.trustpilot.com/pony-challenge/maze/${this.mazeId}`, {
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

  renderMaze () {
    if (!this.mazeId) {
      return
    }

    let request = new Request(`https://ponychallenge.trustpilot.com/pony-challenge/maze/${this.mazeId}`, {
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

  solveMaze () {
    let solve = (index, end) => {
      let start = { 'idx': index, 'parent': null }
      let queue = []
      queue.push(start)

      let visisted = []
      visisted.push(index)

      while (queue.length !== 0) {
        let node = queue.shift()
        if (node.idx === this.endPoint) {
          return node
        }
        if (!this.data[node.idx].includes('west') && !visisted.includes(node.idx - 1)) {
          visisted.push(node.idx - 1)
          queue.push({ 'idx': node.idx - 1, 'parent': node })
        }
        if (this.data[node.idx + 1] !== undefined && !this.data[node.idx + 1].includes('west') && !visisted.includes(node.idx + 1)) {
          visisted.push(node.idx + 1)
          queue.push({ 'idx': node.idx + 1, 'parent': node })
        }
        if (this.data[node.idx + this._width] !== undefined && !this.data[node.idx + this._width].includes('north') && !visisted.includes(node.idx + this._width)) {
          visisted.push(node.idx + this._width)
          queue.push({ 'idx': node.idx + this._width, 'parent': node })
        }
        if (!this.data[node.idx].includes('north') && !visisted.includes(node.idx - this._width)) {
          visisted.push(node.idx - this._width)
          queue.push({ 'idx': node.idx - this._width, 'parent': node })
        }
      }

      return start
    }

    let path = []
    let node = solve(this.pony, this.endPoint)
    while ((node = node.parent) != null) {
      if (node.idx !== this.pony && node.idx !== this.endPoint) {
        path.push(node.idx)
      }
    }

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

let maze = null // eslint-disable-line no-unused-vars

document.addEventListener('DOMContentLoaded', e => {
  let toggleCheatingCheckbox = document.getElementById('enable-cheating')
  toggleCheatingCheckbox.checked = window.sessionStorage.getItem('enable-cheating') === 'true'
  toggleCheatingCheckbox.addEventListener('click', (_) => {
    window.sessionStorage.setItem('enable-cheating', toggleCheatingCheckbox.checked)
    maze.cheating = toggleCheatingCheckbox.checked
  })

  console.log(toggleCheatingCheckbox.checked)

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
