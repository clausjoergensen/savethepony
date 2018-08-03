'use strict'

var game = function(playerName, width, height) {

    var _mazeId = ''

    function createMaze(json) {
        var cellSize = 40
        var pony = parseInt(json.pony)
        var domokun = parseInt(json.domokun)
        var endPoint = parseInt(json['end-point'])
        var width = json.size[0]
        var height = json.size[1]
        var index = 0

        var table = document.createElement('table')
        table.id = 'maze'
        table.classList.add('game')
        table.cellSpacing = '0'
        table.style.width = width * cellSize
        table.style.height = height * cellSize

        for (var row = 1; row <= height; row++) {
            var tr = table.insertRow(-1)

            for (var column = 1; column <= width; column++) {
                var td = tr.insertCell(-1)

                if (json.data[index].indexOf('west') != -1) {
                    td.classList.add('westWall')
                }

                if (json.data[index].indexOf('north') != -1) {
                    td.classList.add('northWall')
                }

                if (index === pony) {
                    td.classList.add('pony')
                }

                if (index === domokun) {
                    td.classList.add('domokun')
                }

                if (index === endPoint) {
                    td.classList.add('endPoint')
                }

                index++
            }

        }
        return table
    }

    function updateMaze(table, json) {
        var pony = parseInt(json.pony)
        var domokun = parseInt(json.domokun)
        var width = json.size[0]
        var height = json.size[1]
        var index = 0

        for (var row = 1; row <= height; row++) {
            var tr = table.rows[row - 1]

            for (var column = 1; column <= width; column++) {
                var td = tr.cells[column - 1]

                if (index === pony) {
                    td.classList.remove('path')
                    td.classList.add('pony')
                } else {
                    td.classList.remove('pony')
                }

                if (index === domokun) {
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

    function printMaze(mazeId) {
        fetch(new Request(`https://ponychallenge.trustpilot.com/pony-challenge/maze/${mazeId}`, {
            method: 'GET',
            headers: new Headers({ 'Content-Type': 'application/json' })
        }))
        .then(response => { return response.json() })
        .then(json => {
            var pony = parseInt(json.pony)
            var domokun = parseInt(json.domokun)
            var endPoint = parseInt(json['end-point'])

            if (pony == endPoint) {
                document.removeEventListener('keydown', keyEvent)
                console.log('Congratulations, you won!')
                var animationId = setInterval(fadeOut, 40);
                function fadeOut() {
                    var maze = document.getElementById('maze')
                    if (!maze.style.opacity) {
                        maze.style.opacity = 1
                    }
                    if (maze.style.opacity > 0) {
                        maze.style.opacity -= 0.1
                    } else {
                        clearInterval(animationId)
                        document.getElementById('game-result').innerText = 'Congratulations, you won!'
                        document.getElementById('game-result').style.visibility = 'visible'
                    }
                }
            } else if (pony == domokun) {
                document.removeEventListener('keydown', keyEvent)
                console.log('Sorry, you lost!')
                var animationId = setInterval(fadeOut, 40);
                function fadeOut() {
                    var maze = document.getElementById('maze')
                    if (!maze.style.opacity) {
                        maze.style.opacity = 1
                    }
                    if (maze.style.opacity > 0) {
                        maze.style.opacity -= 0.1
                    } else {
                        clearInterval(animationId)
                        document.getElementById('game-result').innerText = 'Sorry, you lost!'
                        document.getElementById('game-result').style.visibility = 'visible'
                    }
                }
            }

            let maze = document.getElementById('maze')
            if (maze === null) {
                document.getElementById('maze-container').appendChild(createMaze(json))
            } else {
                updateMaze(maze, json)
            }

            if (document.getElementById('enable-cheating').checked) {
                solveMaze(json, document.getElementById('maze'))
            } else {
                unsolveMaze(document.getElementById('maze'))
            }
        })
        .catch(error => {
            console.log(error)
        })
    }

    function solveMaze(json, table) {

        function solve(index, end) {
            var start = { 'idx': index, 'parent': null }
            var queue = []
            queue.push(start)
            var visisted = []
            visisted.push(index)
            var width = parseInt(json.size[0])
            while (queue.length != 0) {
                var node = queue.shift()
                if (node.idx == end) {
                    return node
                }
                if (!json.data[node.idx].includes('west') && !visisted.includes(node.idx - 1)) {
                    visisted.push(node.idx - 1)
                    queue.push({ 'idx': node.idx - 1, 'parent': node })
                }
                if (json.data[node.idx + 1] !== undefined && !json.data[node.idx + 1].includes('west') && !visisted.includes(node.idx + 1)) {
                    visisted.push(node.idx + 1)
                    queue.push({ 'idx': node.idx + 1, 'parent': node })
                }
                if (json.data[node.idx + width] !== undefined && !json.data[node.idx + width].includes('north') && !visisted.includes(node.idx + width)) {
                    visisted.push(node.idx + width)
                    queue.push({ 'idx': node.idx + width, 'parent': node })
                }
                if (!json.data[node.idx].includes('north') && !visisted.includes(node.idx - width)) {
                    visisted.push(node.idx - width)
                    queue.push({ 'idx': node.idx - width, 'parent': node })
                }
            }
        }

        var pony = parseInt(json.pony)
        var domokun = parseInt(json.domokun)
        var end = parseInt(json['end-point'])
        var path = []
        var node = solve(pony, end)
        while ((node = node.parent) != null)
        {
            if (node.idx != pony && node.idx != end) {
                path.push(node.idx)
            }
        }

        var width = json.size[0]
        var height = json.size[1]
        var index = 0

        for (var row = 1; row <= height; row++) {
            var tr = table.rows[row - 1]

            for (var column = 1; column <= width; column++) {
                var td = tr.cells[column - 1]

                if (path.includes(index) && index != domokun) {
                    td.classList.add('path')
                }

                index++
            }
        }
    }

    function unsolveMaze(table) {
        for (var row = 0; row < table.rows.length; row++) {
            var tr = table.rows[row]
            for (var column = 0; column < tr.cells.length; column++) {
                var td = tr.cells[column]
                td.classList.remove('path')
            }
        }
    }

    function toggleCheating(event) {
        printMaze(_mazeId)
        window.sessionStorage.setItem('enable-cheating', true)
    }

    function keyEvent(event) {
        var direction = ''

        if (event.keyCode == 37) { // Left
            direction = 'west'
        } else if (event.keyCode == 38) { // Up
            direction = 'north'
        } else if (event.keyCode == 39) { // Right
            direction = 'east'
        } else if (event.keyCode == 40) { // Down
            direction = 'south'
        } else {
            return
        }

        fetch(new Request(`https://ponychallenge.trustpilot.com/pony-challenge/maze/${_mazeId}`, {
                method: 'POST',
                body: JSON.stringify({
                    direction: direction
                }),
                headers: new Headers({ 'Content-Type': 'application/json' })
            }))
            .then(response => {
                printMaze(_mazeId)
            })
            .catch(error => {
                console.log(error)
            })
    }

    fetch(new Request('https://ponychallenge.trustpilot.com/pony-challenge/maze', {
            method: 'POST',
            body: JSON.stringify({
                'maze-width': width,
                'maze-height': height,
                'maze-player-name': playerName,
                'difficulty': 0
            }),
            headers: new Headers({ 'Content-Type': 'application/json' })
        }))
        .then(response => { return response.json() })
        .then(json => { return json.maze_id })
        .then(mazeId => {
            _mazeId = mazeId
            printMaze(mazeId)
            document.addEventListener('keydown', keyEvent)
            document.getElementById('enable-cheating').addEventListener('click', toggleCheating)
        })
        .catch(error => {
            console.log(error)
        })
}

document.addEventListener("DOMContentLoaded", function(event) {
    document.getElementById('enable-cheating').checked = window.sessionStorage.getItem('enable-cheating')
});

game('Twilight Sparkle', 15, 15)

