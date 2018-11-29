'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
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
const Bootstrap = require('libp2p-railing')

const Pushable = require('pull-pushable')
const p = Pushable()

const bootstrapers = [
  '/ip4/10.0.0.10/tcp/9999/ws/ipfs/QmdiF2cLAE3MtcE7Xw3qR6nk9inFiqUS4tbwQWdAuEByVd'
]

class MyBundle extends libp2p {
  constructor (_options) {
    const defaults = {
      modules: {
        transport: [ TCP, WebSockets ],
        streamMuxer: [ SPDY ],
        connEncryption: [ SECIO ],
        peerDiscovery: [ Bootstrap ],
//        connProtector: new Protector(swarmId),
        dht: KadDHT
      },
      config: {
        peerDiscovery: {
          bootstrap: {
            interval: 2000,
            enabled: true,
            list: bootstrapers
          }
        },
        dht: {
          kBucketSize: 20
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

PeerInfo.create((err, peerInfo) => {
//  peerInfo.multiaddrs.add('/ip4/192.168.1.6/tcp/9999')
  node = new MyBundle({
    peerInfo
  })

  node.handle('/message', (protocol, conn) => {
    pull(
      conn,
      pull.map((data) => {
        let message = data.toString('utf8').replace(/\n$/,"")
        console.log(data.toString('utf8'))
/*
        conn.getPeerInfo((err, peerInfo) => {
          const idStr = peerInfo.id.toB58String()
          console.log(idStr + ":: " + string)
        })
*/
      }),
      pull.drain(()=>{})
    )
  })


  node.on('peer:discovery', (peer) => {
    console.log('Discovered:', peer.id.toB58String())
//    node.dial(peer, () => {})
  })

  node.start((err)=>{
    if(err) console.log(err)
    console.log("bootStraperTestNode started -> " + node.peerInfo.id.toB58String())
    node.peerInfo.multiaddrs.forEach((ma) => {
      console.log("multiaddr -> " + ma.toString())
    })

    let toPeerId = PeerId.createFromB58String('QmdiF2cLAE3MtcE7Xw3qR6nk9inFiqUS4tbwQWdAuEByVd')

// need to set peer to send to, create peerId from this id, then create peerInfo
// and send message to it

//      node.dialProtocol(toPeerId, '/message', (err, conn) => {
//        console.log("dial /message")
//      })



    PeerInfo.create(toPeerId, (err, toPeerInfo) => {
      if(err) console.log(err)
      console.log("info: " + toPeerInfo)
//      toPeerInfo.multiaddrs.add('/ip4/192.168.1.6/tcp/9999')
//      toPeerInfo.multiaddrs.add('/ip4/192.168.1.6/tcp/9999/ws/ipfs/QmdiF2cLAE3MtcE7Xw3qR6nk9inFiqUS4tbwQWdAuEByVd')
      toPeerInfo.multiaddrs.add('/ip4/10.0.0.10/tcp/9999/ws/ipfs/QmdiF2cLAE3MtcE7Xw3qR6nk9inFiqUS4tbwQWdAuEByVd')
      console.log(toPeerInfo.multiaddrs.toArray())

      process.stdin.setEncoding('utf8')
      process.openStdin().on('data', (chunk) => {
        var data = chunk.toString()
        p.push(data)
//console.log(toPeerId)
        node.dialProtocol(toPeerInfo, '/message', (err, conn) => {
          if(err) console.log("err: " + err)
          pull(
            p,
            conn
          )
          console.log("dial /message -> " + data)
        })
//console.log(data)
      })

    })

  })

})

