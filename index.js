const Rx = require('rx')
const near = [ [0,-1],
         [-1, 0],  [1, 0],
               [0, 1] ]

const classes = ['btn-default', '', 'btn-info', 'btn-primary', 'btn-success', 'btn-warning', 'btn-danger']
const powers = {} //game atom

const playground = document.getElementById('playground')
const nextPiecePower = document.getElementById('nextPiecePower')
const nextPieceSample = document.getElementById('nextPieceSample')

const state = new Rx.Subject()
/*
const subscription = state.subscribe(
  function (x) {
      console.log('Next: ' + x.toString())
  },
  function (err) {
      console.log('Error: ' + err)
  },
  function () {
      console.log('Completed')
  });
*/
const getPositionId = (i) => `x${i[0]}_y${i[1]}`

const neighbours = (p) =>
  near.map(i => [ (p[0] + i[0]), (p[1] + i[1]) ])

const neighboursWithPower = (curr, i) => {
  const nearNeighbours = neighbours(i)
    .map(pos => [ pos[0], pos[1], powers[getPositionId(pos)] || 0 ])
    .filter(x => x[2] === i[2]
      && !curr.some(a => a[0] === x[0] && a[1] === x[1]))
  var nx = curr.concat(nearNeighbours)
  nearNeighbours.map(x=> nx = neighboursWithPower(nx, x))
  return nx
}

const levelUp = (i) => {
  var n = neighboursWithPower([i], i)
  if (n.length < 3) return Rx.Observable.just(i)

  i[2] = i[2] + 1; //single levelUp
  return levelUp(i)
    .concat(Rx.Observable.from(n)
      .skip(1)
      .map(x => {
        x[2] = 0; //clear power
        return x
      })
    )
}

function* nextPiece(){
  var index = 0;
  while(true)
    yield 1 + parseInt(Math.random() * 3);
}

const pcs = new Rx.Subject()
pcs.onNext(parseInt(Math.random() * 5))

const getNewPiece = () => {
  pcs.onNext(parseInt(Math.random() * 5))
  np = nextPiece().next().value
  nextPieceSample.className = 'btn ' + classes[np]
  nextPieceSample.innerHTML = np
  console.log('next piece', np)
}
getNewPiece()

function positionFromString(str){
    const a = str.split(',');
    return [a[0] - 0, a[1] - 0]
}

const source = Rx.Observable.fromEvent(playground, 'click')
const clicks$ = source
  .pluck('target', 'attributes', 'data', 'value')
  .filter(x => x !== null)
  .map(positionFromString)
  .map(x => {
    const power = np;
    getNewPiece()
    powers[getPositionId(x)] = np
    return [x[0], x[1], power]
  })

clicks$.concatMap(x => levelUp(x))
  .subscribe(x => {
    powers[getPositionId([x[0] , x[1]])] = x[2]
    state.onNext(x)
  })

const hover = Rx.Observable.fromEvent(playground, 'mouseover')
  .pluck('target', 'attributes', 'data', 'value')
  .filter(x => x != null)
  .distinctUntilChanged()
  .map(positionFromString)
const mouseOut = Rx.Observable.fromEvent(playground, 'mouseout')
  .pluck('target', 'attributes', 'data', 'value')
  .filter(x => x != null)
  .distinctUntilChanged()
  .map(positionFromString)

hover.scan((acc, x) => [x, acc[0]], [[0,0], null])
  .subscribe(x=> {
    console.log('hover scan', x[0], 'out', x[1])
    writeItem(x[1])
    const hovered = [x[0][0],x[0][1], np]
    writeItem(hovered)
  });
/*
hover.combineLatest(mouseOut)
  .subscribe(x=> {
    //console.log('hover', x[0], 'out', x[1])
    writeItem(x[1]) // clear hovered back to current power
    const hovered = [x[0][0],x[0][1], np]
    writeItem(hovered)
  });
*/
Rx.Observable.range(1, 8)
  .concatMap(x => Rx.Observable.range(1, 8)
                    .map(y=> [y, x]))
  //.concat(Rx.Observable.return([1,1,1]))
  .concat(state)
  .subscribe(writeItem)

function writeItem(i) {
  const id = getPositionId(i)
  const power = i[2] || 0
  const className = 'btn ' + classes[power]
  const disabled = power === 0 ? '' : 'readonly'
  const html = `<button id='${id}'
                        class='${className}'
                        title='${i[0]} ${i[1]}'
                        ${disabled}
                        data='${i[0]},${i[1]}'
                        >${power}</button>`
  power[i[0],i[1]] = power
  if (document.getElementById(id) == null)
    playground.innerHTML += html + ((i[0] === 8) ? '<br>' : '')
  else
    document.getElementById(id).outerHTML = html
}

//for render


//maybe this can be used instead of powers
//state.scan((acc, x, i, source) => acc.concat([x]), [])
//  .subscribe(x => console.log('scan', x))
