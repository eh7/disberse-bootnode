/* eslint-disable no-console */
'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const WebRTCStar = require('libp2p-webrtc-star')
const SPDY = require('libp2p-spdy')
const SECIO = require('libp2p-secio')
const KadDHT = require('libp2p-kad-dht')
const Protector = require('libp2p-pnet')
const PeerInfo = require('peer-info')
const PeerId   = require('peer-id')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const series = require('async/series')
const pull = require('pull-stream')
const defaultsDeep = require('@nodeutils/defaults-deep')

const Circuit = require('libp2p-circuit')
const multiaddr = require('multiaddr')

class MyBundle extends libp2p {
  constructor (_options) {
    const wrtcStar = new WebRTCStar({ id: _options.peerInfo.id, key: 'eh7peerjs' })
    const defaults = {
      modules: {
        transport: [ TCP, WebSockets, wrtcStar ],
        streamMuxer: [ SPDY ],
        connEncryption: [ SECIO ],
//        connProtector: new Protector(swarmId),
        dht: KadDHT
      },
      config: {
        dht: {
          kBucketSize: 20
        },
        relay: {
          enabled: true,
          hop: {
            enabled: true,
            active: true
          }
        },
        EXPERIMENTAL: {
        // dht must be enabled
          dht: true
        }
      }
    }

    super(defaultsDeep(_options, defaults))
  }
}

let node

var directorId = require('./director-id.json')

let peerCheck = []
let peerMap = []

PeerInfo.create(directorId, (err, peerInfo) => {
  peerInfo.multiaddrs.add('/dns4/eh1-15.eh7.co.uk/tcp/9998/wss')
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/9999/ws')
  peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/9999/ws')
  node = new MyBundle({
    peerInfo
  })

  node.on('peer:disconnect', (peer) => {
    console.log("disconnect from " + peer.id.toB58String())
    
    console.log("cleer peerMap for " + peer.id.toB58String())
    for(var i=0;i<peerMap.length;i++) {
      if(peerMap[i].substr(0,46) === peer.id.toB58String()) {
        console.log("pm: " + peer.id.toB58String() + " " + peerMap[i].substr(0,46))
        delete peerMap[i]
      }
    }
    peerMap = peerMap.filter(function (el) {
      return el != null;
    })
//    peerMap.
//    peerCheck[data.toString('utf8')] = true
  })

  node.on('peer:discovery', (peer) => {
    console.log("discoverd from " + peer.id.toB58String())
  })

  node.on('peer:connect', (peer) => {
    console.log("connection from " + peer.id.toB58String())
  })


  node.handle('/peerMap', (protocol, conn) => {
    console.log("/peerMap Send latest peerMap to dialer")
    console.log(peerMap)
    pull(
      pull.values(peerMap),
      conn
    )
  })

  node.handle('/register', (protocol, conn) => {
    pull(
      conn,
      pull.map((data) => {
        let message = data.toString('utf8').replace(/\n$/,"")
        if(!peerCheck[data.toString('utf8')]) {
          console.log("added peer to peerMap")
          peerCheck[data.toString('utf8')] = true
          peerMap.push(data.toString('utf8'))
        }
        console.log(data.toString('utf8'))
        console.log(peerMap)
        console.log("sendPeerMap")
      }),
      pull.drain(()=>{})
    )

/*
    node.dialProtocol(peerInfo, '/sendPeerMap', (err, conn) => {
      console.log("sendingPeerMap")
      pull(
        pull.values(["peerMap"]),
        conn
      )
    })
*/

  })

  node.handle('/message', (protocol, conn) => {
    pull(
      conn,
      pull.map((data) => {
        let message = data.toString('utf8').replace(/\n$/,"")
        console.log(data.toString('utf8'))
/*
        var string = new TextDecoder("utf-8").decode(data)
        conn.getPeerInfo((err, peerInfo) => {
          const idStr = peerInfo.id.toB58String()
          console.log(idStr + ":: " + string)
        })
*/
      }),
      pull.drain(()=>{})
    )
  })

  node.start((err)=>{
    if(err) console.log(err)
    console.log("Bootstraper started -> " + node.peerInfo.id.toB58String())
    node.peerInfo.multiaddrs.forEach((ma) => {
      console.log("multiaddr -> " + ma.toString())
    })
  })

})

/*
parallel([
  (cb) => createNode(cb)
], (err, nodes) => {
  if (err) { throw err }

  const directorNode = nodes[0]

  directorNode.on('peer:connect', (peerInfo) => {
    console.log("Connect to " + peerInfo.id.toB58String())

    directorNode.dialProtocol(peerInfo, '/disberse/peer/0.0.0', (err, conn) => {

      var message = "ack connect from " + directorNode.peerInfo.id.toB58String();

      console.log("Send ack request to peer")
      pull(
        pull.values([message]),
        conn
      )
    })

  })

  directorNode.handle('/director/register', (protocol, conn) => {
    console.log("/director/register")
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })


//  console.log(directorNode.peerInfo.id.toB58String())
  directorNode.peerInfo.multiaddrs.forEach((ma) => {
    console.log(ma.toString('utf8'))
  })
}
*/
