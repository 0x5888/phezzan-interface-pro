export default class SocketClient {
    constructor(base_url, path) {
      // @ts-ignore
      this.baseUrl = 'wss://fstream.binance.com:9443/ws'
      // @ts-ignore
      this.tvIntervals = {
        '1': '1m',
        '3': '3m',
        '5': '5m',
        '15': '15m',
        '30': '30m',
        '60': '1h',
        '120': '2h',
        '240': '4h',
        '360': '6h',
        '480': '8h',
        '720': '12h',
        'D': '1d',
        '1D': '1d',
        '3D': '3d',
        'W': '1w',
        '1W': '1w',
        'M': '1M',
        '1M': '1M',
      };
      // @ts-ignore
      this.streams = {}; // e.g: {'BTCUSDT': { paramStr: '', data:{}, listener:  } }
      this._createSocket();
    }
  
    _createSocket() {
      // @ts-ignore
      this._ws = new WebSocket(this.baseUrl)
      // @ts-ignore
      this._ws.onopen = (e) => {
        console.info(`Binance WS Open`)
        // @ts-ignore
        localStorage.setItem("wsStatus", 1)
      }
  
      // @ts-ignore
      this._ws.onclose = () => {
        console.warn('Binance WS Closed')
        // @ts-ignore
        localStorage.setItem("wsStatus", 0)
      }
  
      // @ts-ignore
      this._ws.onerror = (err) => {
        console.warn('WS Error', err)
        // @ts-ignore
        localStorage.setItem("wsStatus", 0)
      }
  
      // @ts-ignore
      this._ws.onmessage = (msg) => {
        if (!msg?.data) return
        let sData = JSON.parse(msg.data)
        try {
          if (sData && sData.k) {
            let { s, E } = sData
            let { o, h, l, v, c, T, t } = sData.k
            // Update data
            let lastSocketData = {
              time: t,
              close: parseFloat(c),
              open: parseFloat(o),
              high: parseFloat(h),
              low: parseFloat(l),
              volume: parseFloat(v),
              closeTime: T,
              openTime: t,
            }
            // @ts-ignore
            if (Object.keys(this.streams).length) {
              // @ts-ignore
              this.streams[s].data = lastSocketData
              // @ts-ignore
              this.streams[s].listener(lastSocketData)
            }
          }
        }
        catch (e) {
          console.error(e)
        }
  
      }
    }
  
    subscribeOnStream(symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback, lastDailyBar) {
      try {
        // @ts-ignore
        let paramStr = `${symbolInfo.name.toLowerCase()}@kline_${this.tvIntervals[resolution]}`
        const obj = {
          method: "SUBSCRIBE",
          params: [
            paramStr
          ],
          id: 1
        }
        // @ts-ignore
        if (this._ws.readyState === 1) {
          // @ts-ignore
          this._ws.send(JSON.stringify(obj))
          // @ts-ignore
          this.streams[symbolInfo.name] = {  //register multiple streams in streams object
            paramStr,
            listener: onRealtimeCallback
          }
        }
      }
      catch (e) {
        console.error(e)
      }
    }
  
    unsubscribeFromStream(subscriberUID) {
      try {
        let id = subscriberUID.split("_")[0]
        const obj = {
          method: "UNSUBSCRIBE",
          params: [
            // @ts-ignore
            this.streams[id].paramStr
          ],
          id: 1
        }
        // @ts-ignore
        delete this.streams[id]
        // @ts-ignore
        if (this._ws.readyState === 1) {
          // @ts-ignore
          this._ws.send(JSON.stringify(obj))
        }
      }
      catch (e) {
        console.error(e)
      }
    }
  }