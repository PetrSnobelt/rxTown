const Rx = require('rx')
//import Rx from 'rx'

//self first, then neighbours
const near = [ [0, 0],
                    [0,-1],
              [-1, 0],  [1, 0],
                    [0, 1]]

const playground = document.getElementById('playground')
const classes = ['btn-default', 'btn-primary', 'btn-info', 'btn-success', 'btn-warning', 'btn-danger']
const powers = {}

const state = new Rx.Subject()
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

const neighbours = (p) =>
  near.map(i => [ (p[0] + i[0]), (p[1] + i[1]) ])

const getPositionId = (i) => `x${i[0]}_y${i[1]}`

const neighboursWithPower = (curr, i) => {
  const newN = neighbours(i)
    .map(pos => [ pos[0], pos[1], powers[getPositionId(pos)] || 0 ])
    .filter(x => x[2] === i[2]
      && !curr.some(a => a[0] === x[0] && a[1] === x[1]))
  var nx = curr.concat(newN)
  newN.map(x=> nx = neighboursWithPower(nx, x))
  return nx
}

const levelUp = (i) => {
  //najít neight filtrovat dle power v případě že najde
  //tak rekurzivně pokračovat

  var n = neighboursWithPower([i], i)
  if (n.length < 3) return Rx.Observable.empty().single({defaultValue: i});

  i[2] = i[2] + 1; //levelUp
  return levelUp(i)
    .concat(Rx.Observable.from(n)
      .skip(1)
      .map((x,i) => {
        x[2] = 0; //clear power
        return x
      })
    )

  //todo - set correct power
  return Rx.Observable.from(n)
    .map((x,i) => {
      if (i === 0)
        x[2] = x[2] + 1; //levelUp
      else
        x[2] = 0; //clear others
      return x
    })
}

const source = Rx.Observable.fromEvent(playground, 'click')
const clicks$ = source
  .pluck('target', 'attributes', 'data', 'value')
  .map(x => {
    const a = x.split(',');
    powers[getPositionId([a[0] - 0, a[1]])] = 1
    return [a[0] - 0, a[1] - 0, 1]
  })
  .concatMap(x => levelUp(x))
  .subscribe(x => {
    powers[getPositionId([x[0] , x[1]])] = x[2]
    state.onNext(x)
  })


Rx.Observable.range(1, 8)
	.concatMap(x => Rx.Observable.range(1, 8)
							      .map(y=> [y, x]))
  //.concat(Rx.Observable.return([1,1,1]))
  .concat(state)
	.subscribe(i => {
  const id = `x${i[0]}_y${i[1]}`
  const power = i[2] || 0
  const className = 'btn ' + classes[power]
  const disabled = power === 0 ? '' : 'disabled'
  const html = `<button id='${id}'
                        class='${className}'
                        power='${power}'
                        ${disabled}
                        data='${i[0]},${i[1]}'
                        >[${i[0]} ${i[1]}]</button>`
  power[i[0],i[1]] = power
  if (document.getElementById(id) == null)
    playground.innerHTML += html + ((i[0] === 8) ? '<br>' : '')
  else
    document.getElementById(id).outerHTML = html
})

//state.scan((acc, x, i, source) => acc.concat([x]), [])
//	.subscribe(x => console.log('scan', x))

// stream by mohl vypadat takto
//startstream
//clicked stream
//mapovaný na levelUpStream

/*
mám hrací plochu
mapa/pole - pro rychlý přístup
po kliku chci překreslit jen updated data => je potřeba poslat jen updated events
*/
