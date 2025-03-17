import { connect } from 'cloudflare:sockets';

let userID = '';

const mirrorTOs = ['proksy1.safesurf.ir'];
let mirrorTO = mirrorTOs[Math.floor(Math.random() * mirrorTOs.length)];
//let dohURL = 'https://sky.rethinkdns.com/1:-Pf_____9_8A_AMAIgE8kMABVDDmKOHTAKg=';  let dohURL =  'https://cloudflare-dns.com/dns-query'; let dohURL =  'https://dns.adguard-dns.com/dns-query'
let dohURL =  'https://dns.google/dns-query'
// v2board api environment variables
let nodeId = ''; // 
let apiToken = ''; //abcdefghijklmnopqrstuvwxyz123456
let apiHost = ''; // api.v2board.com
/* if (!isValidUUID(userID)) {
	throw new Error('uuid is invalid');
} */

export default {
	/**
	 * @param {import("@cloudflare/workers-types").Request} request
	 * @param {{UUID: string, mirrorTO: string, DNS_RESOLVER_URL: string, NODE_ID: int, API_HOST: string, API_TOKEN: string}} env
	 * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
    async fetch(request, env, ctx) {
        try {
            // Initialize environment configurations
            const userID = env.UUID;
            mirrorTO = env.mirrorTO || mirrorTO; // Preserve mirrorTO fallback
            dohURL = env.DNS_RESOLVER_URL || dohURL; // Preserve DNS resolver
            nodeId = env.NODE_ID || nodeId;
            apiToken = env.API_TOKEN || apiToken;
            apiHost = env.API_HOST || apiHost;
            
            // Extract UUID path with expiration handling
            let userID_Path = userID.includes(',') 
                ? userID.split(',')[0].trim() 
                : userID;
            const url = new URL(request.url);
            const pathUUID = url.pathname.split('/').pop();
            // UUID validation with expiration check
            if (pathUUID && pathUUID.includes('-')) {
                const uuidParts = pathUUID.split('-');

                if (uuidParts.length === 5) {
                    const baseUUID = uuidParts.slice(0, 4).join('-');
                    const envBase = userID.split('-').slice(0, 4).join('-');
    
                    if (baseUUID === envBase) {
                        const dateSegment = uuidParts[4];
                        if (dateSegment.length === 12) {
                            // 1. Validate entire segment is numeric
                            if (!/^\d{12}$/.test(dateSegment)) {
                                    return new Response('Not numb.', { status: 400 });
                            }                             
                                // Expiration date parsing and validation
                            const addValue = parseInt(dateSegment.substring(11, 12), 10);
                            if (addValue < 1 || addValue > 9) {
                                return new Response('Invalid SC', { status: 400 }); //Invalid Security Code
                            }
                            const ConfigType = parseInt(dateSegment.substring(10, 11), 10);
                            if (ConfigType !== 0 && ConfigType !== 9) {
                                return new Response('Invalid CT', { status: 400 }); //Invalid ConfigType
                            }
                            if (ConfigType === 9 && addValue !== 6) {
                                return new Response('Invalid CT', { status: 400 }); //Invalid ConfigType
                            }                                                               
                            const day = parseInt(dateSegment.substring(0, 2), 10) - addValue;
                            const month = parseInt(dateSegment.substring(2, 4), 10) - addValue;
                            const year1 = parseInt(dateSegment.substring(4, 6), 10) - addValue;
                            const year2 = parseInt(dateSegment.substring(6, 8), 10) - addValue;
                            const daysValid = parseInt(dateSegment.substring(8, 10), 10) - addValue;
                            const year = year1* 100 +year2;
                            const startDate = new Date(year, month - 1, day);
                            // Normalize startDate to midnight
                            startDate.setHours(0, 0, 0, 0);
                            const now = new Date();
                            // Normalize now to midnight
                            now.setHours(0, 0, 0, 0);
                            // Validate numeric ranges
                            if (day < 1 || day > 31) {
                                return new Response('Invalid DV', { status: 400 }); //Invalid day value
                            }
                            if (month < 1 || month > 12) {
                                return new Response('Invalid MV', { status: 400 }); //Invalid month value
                            }
                            if (year < 2025) {
                                return new Response('2025?', { status: 400 }); //Year must be ≥2025
                            }
                    
                            // Validate duration codes
                            const validDurations = new Set([2, 31, 61, 91]);
                            if (!validDurations.has(daysValid)) {
                                return new Response('Invalid SD', { status: 400 }); //Invalid subscription duration
                            }
                    
                            // Validate date validity
                            if (isNaN(startDate.getTime())) {
                                return new Response('Invalid date combination', { status: 400 });
                            }
                    
                            // Check start date is not future-dated
                            if (startDate > now) {
                                return new Response('SDF', { status: 400 }); //Start date cannot be in the future
                            }
                            if (!isNaN(startDate.getTime())) {
                                const expirationDate = new Date(startDate);
                                expirationDate.setDate(startDate.getDate() + daysValid - 1);
                                expirationDate.setHours(0, 0, 0, 0)
                                if (now > expirationDate) {
                                    return new Response('SE', { status: 403 }); //Subscription expired
                                }
                                userID_Path = pathUUID; // Use validated UUID with expiration
                            }
                        }
                    }
                }
            }

            // Country validation
            //if (request.cf.country !== 'IR') {
                //return new Response('Service not available in your country', { status: 403 });
            //}
            //let remoteDNS = "https://94.140.14.14/dns-query";
            //let localDNS = "1.1.1.1"; 
              // Generate a random number between 0 and 1
            let randomNumber = Math.random();

            // If the random number is less than 1/10, execute the rest of the code
            if (randomNumber < 1/300) {
            // Get the current data from Workers KV
			let data = await env.settings.get("data");

			if (data === null) {
				data = { timestamp: Date.now(), ips: [], userAgents: [], remoteDNS: "2a06:98c1:54::15:aabf", localDNS: "1.1.1.1", lengthMin:10, lengthMax:20, intervalMin:1, intervalMax:3};
			} else {
				data = JSON.parse(data);
			}
			// If  6 hours have passed since the timestamp, reset the data
			if (Date.now() - data.timestamp >= 6 * 60 * 60 * 1000) {
				data.timestamp = Date.now();
				// Select a random IP from the list
				let randomIndex = Math.floor(Math.random() * data.ips.length);
				data.ips = [data.ips[randomIndex]];
				await env.settings.put("data", JSON.stringify(data));
			}

			// Get the IP of the current request
			let ip = request.headers.get("cf-connecting-ip");
			let userAgent =  request.headers.get('user-agent');
			//let userAgent = userID;
			// If the IP is not in the list and the list already has 5 IPs, reject the request
			if (!data.ips.includes(ip) && data.ips.filter(isIPv4).length >= 15) {
				return new Response('Rate limit exceeded', {status: 429});
			}
			// If the IP is not in the list, add it
			if (!data.ips.includes(ip) && !data.userAgents.includes(userAgent)) {
				data.ips.push(ip);
				data.userAgents.push(userAgent);
				await env.settings.put("data", JSON.stringify(data));
			}
            }
            const upgradeHeader = request.headers.get("Upgrade");
        

            
            if (!upgradeHeader || upgradeHeader !== "websocket") {
                
                const host = request.headers.get("Host");
                const searchParams = new URLSearchParams(url.search);
                const client = searchParams.get("app");
                const configAddr = searchParams.get("addr");

                switch (url.pathname) {

                    case "/cf":
                        return new Response(JSON.stringify(request.cf, null, 4), {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json;charset=utf-8",
                            },
                        });

                    case "/connect": // for test connect to cf socket
                        const [hostname, port] = ["cloudflare.com", "80"];
                        console.log(`Connecting to ${hostname}:${port}...`);

                        try {
                            const socket = await connect({
                                hostname: hostname,
                                port: parseInt(port, 10),
                            });

                            const writer = socket.writable.getWriter();

                            try {
                                await writer.write(
                                    new TextEncoder().encode(
                                        "GET / HTTP/1.1\r\nHost: " + hostname + "\r\n\r\n"
                                    )
                                );
                            } catch (writeError) {
                                writer.releaseLock();
                                await socket.close();
                                return new Response(writeError.message, { status: 500 });
                            }

                            writer.releaseLock();

                            const reader = socket.readable.getReader();
                            let value;

                            try {
                                const result = await reader.read();
                                value = result.value;
                            } catch (readError) {
                                await reader.releaseLock();
                                await socket.close();
                                return new Response(readError.message, { status: 500 });
                            }

                            await reader.releaseLock();
                            await socket.close();

                            return new Response(new TextDecoder().decode(value), {
                                status: 200,
                            });
                        } catch (connectError) {
                            return new Response(connectError.message, { status: 500 });
                        }
                                              
                        case `/sub/${pathUUID}`: {
                            const url = new URL(request.url);
                            const searchParams = url.searchParams;
                            let lvessConfig = await createlvessSub(pathUUID, request.headers.get('Host'));
                        
                            // If 'format' query param equals to 'clash', convert config to base64
                            //if (searchParams.get('format') === 'clash') {
                               // lvessConfig = btoa(lvessConfig);
                            //}
                            // Construct and return response object
                            return new Response(lvessConfig, {
                                status: 200,
                                headers: {
                                    "Content-Type": "text/plain;charset=utf-8",
                                }
                            });
                        }
                    case `/sub1/${pathUUID}`: {  
                        const url = new URL(request.url);
                        const searchParams = url.searchParams;
                        const urlf = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
                        //const fragConfig = configs.find(conf => conf.address === configAddr)?.fragConf; 
                        let lvessfragConfig = await CreateFraglvessConfig(env, pathUUID, request.headers.get('Host'), urlf);
                        // Construct and return response object
                        return new Response(lvessfragConfig, {
                                status: 200,
                                headers: {
                                    "Content-Type": "text/plain;charset=utf-8",
                                }
                            });
                    }
					case `/subif/${pathUUID}`: {  
                        const url = new URL(request.url);
                        const searchParams = url.searchParams;
                        const urlf = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
                        //const fragConfig = configs.find(conf => conf.address === configAddr)?.fragConf; 
                        let lvessfragConfig = await CreateFraglvessConfigif(env, pathUUID, request.headers.get('Host'), urlf);
                        // Construct and return response object
                        return new Response(lvessfragConfig, {
                                status: 200,
                                headers: {
                                    "Content-Type": "text/plain;charset=utf-8",
                                }
                            });
                    }
					case `/subi/${pathUUID}`: {  
                        const url = new URL(request.url);
                        const searchParams = url.searchParams;
                        const urlf = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
                        //const fragConfig = configs.find(conf => conf.address === configAddr)?.fragConf; 
                        let lvessfragConfig = await CreateFraglvessConfigi(env, pathUUID, request.headers.get('Host'), urlf);
                        // Construct and return response object
                        return new Response(lvessfragConfig, {
                                status: 200,
                                headers: {
                                    "Content-Type": "text/plain;charset=utf-8",
                                }
                            });
                    }
					case `/sub2/${pathUUID}`: {  
                        const url = new URL(request.url);
                        const searchParams = url.searchParams; 
                        const urlf = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
                        //const fragConfig = configs.find(conf => conf.address === configAddr)?.fragConf; 
                        let lvessfragConfig1 = await CreateFraglvessConfig1(pathUUID, env, request.headers.get('Host'), urlf);
                        // Construct and return response object
                        return new Response(lvessfragConfig1, {
                                status: 200,
                                headers: {
                                    "Content-Type": "text/plain;charset=utf-8",
                                }
                            });
                    }



                    default:
                        // return new Response('Not found', { status: 404 });
                        // For any other path, reverse prixy to 'www.fmprc.gov.cn' and return the original response
                        url.hostname = "ir.bing.com";
                        url.protocol = "https:";
                        request = new Request(url, request);
                        return await fetch(request);
                }
            } else {
                return await lvessOverWSHandler(request, userID);
            }
        } catch (err) {
      /** @type {Error} */ let e = err;
            return new Response(e.toString());
        }
    },
};

/**
 *
 * @param {import("@cloudflare/workers-types").Request} request
 */
async function lvessOverWSHandler(request, userID) {
    /** @type {import("@cloudflare/workers-types").WebSocket[]} */
    // @ts-ignore
    const webSocketPair = new WebSocketPair();
    const [client, webSocket] = Object.values(webSocketPair);

    webSocket.accept();

    let address = "";
    let portWithRandomLog = "";
    const log = (
    /** @type {string} */ info,
    /** @type {string | undefined} */ event
    ) => {
        console.log(`[${address}:${portWithRandomLog}] ${info}`, event || "");
    };
    const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";

    const readableWebSocketStream = makeReadableWebSocketStream(
        webSocket,
        earlyDataHeader,
        log
    );

    /** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
    let remoteSocketWapper = {
        value: null,
    };
    let udpStreamWrite = null;
    let isDns = false;

    // ws --> remote
    readableWebSocketStream
        .pipeTo(
            new WritableStream({
                async write(chunk, controller) {
                    if (isDns && udpStreamWrite) {
                        return udpStreamWrite(chunk);
                    }
                    if (remoteSocketWapper.value) {
                        const writer = remoteSocketWapper.value.writable.getWriter();
                        await writer.write(chunk);
                        writer.releaseLock();
                        return;
                    }

                    const {
                        hasError,
                        message,
                        portRemote = [
                            443, 8443, 2053, 2083, 2087, 2096, 80, 8080, 8880, 2052, 2082,
                            2086, 2095,
                        ],
                        addressRemote = "",
                        rawDataIndex,
                        lvessVersion = new Uint8Array([0, 0]),
                        isUDP,
                    } = await processlvessHeader(chunk, userID);
                    address = addressRemote;
                    portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? "udp " : "tcp "
                        } `;
                    if (hasError) {
                        // controller.error(message);
                        throw new Error(message); // cf seems has bug, controller.error will not end stream
                        // webSocket.close(1000, message);
                        return;
                    }
                    // if UDP but port not DNS port, close it
                    if (isUDP) {
                        if (portRemote === 53) {
                            isDns = true;
                        } else {
                            // controller.error('UDP prixy only enable for DNS which is port 53');
                            throw new Error("UDP prixy only enable for DNS which is port 53"); // cf seems has bug, controller.error will not end stream
                            return;
                        }
                    }
                    // ["version", "附加信息长度 N"]
                    const lvessResponseHeader = new Uint8Array([lvessVersion[0], 0]);
                    const rawClientData = chunk.slice(rawDataIndex);

                    // TODO: support udp here when cf runtime has udp support
                    if (isDns) {
                        const { write } = await handleUDPOutBound(
                            webSocket,
                            lvessResponseHeader,
                            log
                        );
                        udpStreamWrite = write;
                        udpStreamWrite(rawClientData);
                        return;
                    }
                    handleTCPOutBound(
                        remoteSocketWapper,
                        addressRemote,
                        portRemote,
                        rawClientData,
                        webSocket,
                        lvessResponseHeader,
                        log
                    );
                },
                close() {
                    log(`readableWebSocketStream is close`);
                },
                abort(reason) {
                    log(`readableWebSocketStream is abort`, JSON.stringify(reason));
                },
            })
        )
        .catch((err) => {
            log("readableWebSocketStream pipeTo error", err);
        });

    return new Response(null, {
        status: 101,
        // @ts-ignore
        webSocket: client,
    });
}

let apiResponseCache = null;
let cacheTimeout = null;

/**
 * Fetches the API response from the server and caches it for future use.
 * @returns {Promise<object|null>} A Promise that resolves to the API response object or null if there was an error.
 */
async function fetchApiResponse() {
    const requestOptions = {
        method: "GET",
        redirect: "follow",
    };

    try {
        const response = await fetch(
            `https://${apiHost}/api/v1/server/Uniprixy/user?node_id=${nodeId}&node_type=v2ray&token=${apiToken}`,
            requestOptions
        );

        if (!response.ok) {
            console.error("Error: Network response was not ok");
            return null;
        }
        const apiResponse = await response.json();
        apiResponseCache = apiResponse;

        // Refresh the cache every 5 minutes (300000 milliseconds)
        if (cacheTimeout) {
            clearTimeout(cacheTimeout);
        }
        cacheTimeout = setTimeout(() => fetchApiResponse(), 300000);

        return apiResponse;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

/**
 * Returns the cached API response if it exists, otherwise fetches the API response from the server and caches it for future use.
 * @returns {Promise<object|null>} A Promise that resolves to the cached API response object or the fetched API response object, or null if there was an error.
 */
async function getApiResponse() {
    if (!apiResponseCache) {
        return await fetchApiResponse();
    }
    return apiResponseCache;
}

/**
 * Checks if a given UUID is present in the API response.
 * @param {string} targetUuid The UUID to search for.
 * @returns {Promise<boolean>} A Promise that resolves to true if the UUID is present in the API response, false otherwise.
 */
async function checkUuidInApiResponse(targetUuid) {
    // Check if any of the environment variables are empty
    if (!nodeId || !apiToken || !apiHost) {
        return false;
    }
    try {
        const apiResponse = await getApiResponse();
        if (!apiResponse) {
            return false;
        }
        const isUuidInResponse = apiResponse.users.some((user) => user.uuid.trim().split('-').slice(0,4).join('-').toLowerCase().trim() === targetUuid.trim()
        );
        return isUuidInResponse;
    } catch (error) {
        console.error("Error:", error);
        return false;
    }
}
// Usage example:
//   const targetUuid = "65590e04-a94c-4c59-a1f2-571bce925aad";
//   checkUuidInApiResponse(targetUuid).then(result => console.log(result));

/**
 * Handles outbound TCP connections.
 *
 * @param {any} remoteSocket
 * @param {string} addressRemote The remote address to connect to.
 * @param {number} portRemote The remote port to connect to.
 * @param {Uint8Array} rawClientData The raw client data to write.
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket The WebSocket to pass the remote socket to.
 * @param {Uint8Array} lvessResponseHeader The lvess response header.
 * @param {function} log The logging function.
 * @returns {Promise<void>} The remote socket.
 */
async function handleTCPOutBound(
    remoteSocket,
    addressRemote,
    portRemote,
    rawClientData,
    webSocket,
    lvessResponseHeader,
    log
) {
	const maxRetryCount = 5;
	let retryCount = 0;
    async function connectAndWrite(address, port) {
        /** @type {import("@cloudflare/workers-types").Socket} */
		const socketAddress = {
		  hostname: address,
		  port: port
		};
		const socketOptions = {
		  allowHalfOpen: false
		  // secureTransport: "starttls",
		};
        const tcpSocket = connect(socketAddress, socketOptions);
        remoteSocket.value = tcpSocket;
        log(`connected to ${address}:${port}`);
        const writer = tcpSocket.writable.getWriter();
        await writer.write(rawClientData); // first write, nomal is tls client hello
        writer.releaseLock();
        return tcpSocket;
    }

    // if the cf connect tcp socket have no incoming data, we retry to redirect ip
    async function retry() {
		retryCount++;
		if (retryCount > maxRetryCount) {
		          // no matter retry success or not, close websocket
        tcpSocket.closed
            .catch((error) => {
                console.log("retry tcpSocket closed error", error);
            })
            .finally(() => {
                safeCloseWebSocket(webSocket);
            });
        remoteSocketToWS(tcpSocket, webSocket, lvessResponseHeader, null, log);
		} else {
        const tcpSocket = await connectAndWrite(
            mirrorTO,
            portRemote
			);
			// no matter retry success or not, close websocket
/*         tcpSocket.closed
            .catch((error) => {
                console.log("retry tcpSocket closed error", error);
            })
            .finally(() => {
                safeCloseWebSocket(webSocket);
            }); */
			remoteSocketToWS(tcpSocket, webSocket, lvessResponseHeader, null, log);
		}
	}

    const tcpSocket = await connectAndWrite(addressRemote, portRemote);

    // when remoteSocket is ready, pass to websocket
    // remote--> ws
    remoteSocketToWS(tcpSocket, webSocket, lvessResponseHeader, retry, log);
}
/**
 *
 * @param {import("@cloudflare/workers-types").WebSocket} webSocketServer
 * @param {string} earlyDataHeader for ws 0rtt
 * @param {(info: string)=> void} log for ws 0rtt
 */
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
    let readableStreamCancel = false;
    const stream = new ReadableStream({
        start(controller) {
            webSocketServer.addEventListener("message", (event) => {
                if (readableStreamCancel) {
                    return;
                }
                const message = event.data;
                controller.enqueue(message);
            });

            // The event means that the client closed the client -> server stream.
            // However, the server -> client stream is still open until you call close() on the server side.
            // The WebSocket protocol says that a separate close message must be sent in each direction to fully close the socket.
            webSocketServer.addEventListener("close", () => {
                // client send close, need close server
                // if stream is cancel, skip controller.close
                safeCloseWebSocket(webSocketServer);
                if (readableStreamCancel) {
                    return;
                }
                controller.close();
            });
            webSocketServer.addEventListener("error", (err) => {
                log("webSocketServer has error");
                controller.error(err);
            });
            // for ws 0rtt
            const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
            if (error) {
                controller.error(error);
            } else if (earlyData) {
                controller.enqueue(earlyData);
            }
        },

        pull(controller) {
            // if ws can stop read if stream is full, we can implement backpressure
            // https://streams.spec.whatwg.org/#example-rs-push-backpressure
        },
        cancel(reason) {
            // 1. pipe WritableStream has error, this cancel will called, so ws handle server close into here
            // 2. if readableStream is cancel, all controller.close/enqueue need skip,
            // 3. but from testing controller.error still work even if readableStream is cancel
            if (readableStreamCancel) {
                return;
            }
            log(`ReadableStream was canceled, due to ${reason}`);
            readableStreamCancel = true;
            safeCloseWebSocket(webSocketServer);
        },
    });

    return stream;
}

// https://xtls.github.io/development/protocols/lvess.html
// https://github.com/zizifn/excalidraw-backup/blob/main/v2ray-protocol.excalidraw

/**
 *
 * @param { ArrayBuffer} lvessBuffer
 * @param {string} userID
 * @returns
 */
async function processlvessHeader(lvessBuffer, userID) {
    if (lvessBuffer.byteLength < 24) {
        return {
            hasError: true,
            message: "invalid data",
        };
    }

    const version = new Uint8Array(lvessBuffer.slice(0, 1));
    let isUDP = false;
    
    // Extract and parse UUID from buffer
    const slicedBuffer = new Uint8Array(lvessBuffer.slice(1, 17));
    const slicedBufferString = stringify(slicedBuffer);
    const uuids = userID.includes(",") ? userID.split(",") : [userID.trim()];

    // Extract and normalize client base UUID
    const clientUuidParts = slicedBufferString.split('-');
    const clientBaseUuid = clientUuidParts.slice(0, 4).join('-').toLowerCase();
    let isValidUser = false;
    let isExpired = false;
    // Validate against environment UUIDs (base only)
    //const envBaseuuid = userID.split('-').slice(0, 4).join('-').toLowerCase();
    const envBaseuuid = userID.trim().split('-').slice(0, 4).join('-').toLowerCase();
    const checkUuidInApi = await checkUuidInApiResponse(envBaseuuid);
    isValidUser = uuids.some((envUuid) => {
        //const envBase = envUuid.split('-').slice(0, 4).join('-').toLowerCase();
        return  checkUuidInApi || clientBaseUuid === envUuid.trim().split('-').slice(0, 4).join('-').toLowerCase();
    });
    // Parse expiration date if exists in UUID
    if (clientUuidParts.length === 5) {
        const dateSegment = clientUuidParts[4];
        if (dateSegment.length === 12) {
        // 1. Validate entire segment is numeric
        if (!/^\d{12}$/.test(dateSegment)) {
            return { 
                hasError: true, 
                message: "Invalid date format - must contain only numbers" 
            };
        }            
            // Split into components
            const ddPart = dateSegment.substring(0, 2);
            const mmPart = dateSegment.substring(2, 4);
            const yyPart1 = dateSegment.substring(4, 6);
            const yyPart2 = dateSegment.substring(6, 8);
            const durationPart = dateSegment.substring(8, 10);
            const addValue = parseInt(dateSegment.substring(11, 12), 10);
 /*           const ConfigType = parseInt(dateSegment.substring(10, 11), 10);
              if (ConfigType !== 0 && ConfigType !== 9) {
                return new Response('Invalid ConfigType', { status: 400 });
            }*/         
            // Calculate actual values with additive
            const actualDD = parseInt(ddPart, 10) - addValue;
            const actualMM = parseInt(mmPart, 10) - addValue;
            const actualYY1 = parseInt(yyPart1, 10) - addValue;
            const actualYY2 = parseInt(yyPart2, 10) - addValue;
            const fullYear = actualYY1 * 100 + actualYY2;
            const actualDuration = parseInt(durationPart, 10) - addValue;
    
            // Validate numeric ranges
            if (actualDD < 1 || actualDD > 31) {
                return { hasError: true, message: "Invalid day (1-31)" };
            }
            if (actualMM < 1 || actualMM > 12) {
                return { hasError: true, message: "Invalid month (1-12)" };
            }
            if (fullYear < 2025) {
                return { hasError: true, message: "Year must be ≥2025" };
            }
            if (addValue < 1 || addValue > 9 ) {
                return { hasError: true, message: "stop manipulate" };
            }
    
            // Validate duration codes
            const validDurations = new Set([2, 31, 61, 91]);
            if (!validDurations.has(actualDuration)) {
                return { hasError: true, message: "Invalid duration (2/31/61/91 days)" };
            }
    
            // Validate date validity
            const startDate = new Date(fullYear, actualMM - 1, actualDD);
            if (isNaN(startDate.getTime())) {
                return { hasError: true, message: "Invalid date combination" };
            }
    
            // Check start date is not future-dated
            if (startDate > new Date()) {
                return { hasError: true, message: "Start date cannot be in the future" };
            }
    
            // Calculate expiration
            const expirationDate = new Date(startDate);
            expirationDate.setDate(startDate.getDate() + actualDuration);
            isExpired = Date.now() > expirationDate;
        }
    }

    if (!isValidUser || isExpired) {
        return {
            hasError: true,
            message: "invalid user",
        };
    }
    const optLength = new Uint8Array(lvessBuffer.slice(17, 18))[0];
    //skip opt for now

    const command = new Uint8Array(
        lvessBuffer.slice(18 + optLength, 18 + optLength + 1)
    )[0];

    // 0x01 TCP
    // 0x02 UDP
    // 0x03 MUX
    if (command === 1) {
    } else if (command === 2) {
        isUDP = true;
    } else {
        return {
            hasError: true,
            message: `command ${command} is not support, command 01-tcp,02-udp,03-mux`,
        };
    }
    const portIndex = 18 + optLength + 1;
    const portBuffer = lvessBuffer.slice(portIndex, portIndex + 2);
    // port is big-Endian in raw data etc 80 == 0x005d
    const portRemote = new DataView(portBuffer).getUint16(0);

    let addressIndex = portIndex + 2;
    const addressBuffer = new Uint8Array(
        lvessBuffer.slice(addressIndex, addressIndex + 1)
    );

    // 1--> ipv4  addressLength =4
    // 2--> domain name addressLength=addressBuffer[1]
    // 3--> ipv6  addressLength =16
    const addressType = addressBuffer[0];
    let addressLength = 0;
    let addressValueIndex = addressIndex + 1;
    let addressValue = "";
    switch (addressType) {
        case 1:
            addressLength = 4;
            addressValue = new Uint8Array(
                lvessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
            ).join(".");
            break;
        case 2:
            addressLength = new Uint8Array(
                lvessBuffer.slice(addressValueIndex, addressValueIndex + 1)
            )[0];
            addressValueIndex += 1;
            addressValue = new TextDecoder().decode(
                lvessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
            );
            break;
        case 3:
            addressLength = 16;
            const dataView = new DataView(
                lvessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
            );
            // 2001:0db8:85a3:0000:0000:8a2e:0370:7334
            const ipv6 = [];
            for (let i = 0; i < 8; i++) {
                ipv6.push(dataView.getUint16(i * 2).toString(16));
            }
            addressValue = ipv6.join(":");
            // seems no need add [] for ipv6
            break;
        default:
            return {
                hasError: true,
                message: `invild  addressType is ${addressType}`,
            };
    }
    if (!addressValue) {
        return {
            hasError: true,
            message: `addressValue is empty, addressType is ${addressType}`,
        };
    }

    return {
        hasError: false,
        addressRemote: addressValue,
        addressType,
        portRemote,
        rawDataIndex: addressValueIndex + addressLength,
        lvessVersion: version,
        isUDP,
    };
}

/**
 *
 * @param {import("@cloudflare/workers-types").Socket} remoteSocket
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket
 * @param {ArrayBuffer} lvessResponseHeader
 * @param {(() => Promise<void>) | null} retry
 * @param {*} log
 */
async function remoteSocketToWS(
    remoteSocket,
    webSocket,
    lvessResponseHeader,
    retry,
    log
) {
    // remote--> ws
    //let remoteChunkCount = 0;
    //let chunks = [];
    /** @type {ArrayBuffer | null} */
    let lvessHeader = lvessResponseHeader;
    let hasIncomingData = false; // check if remoteSocket has incoming data
    await remoteSocket.readable
        .pipeTo(
            new WritableStream({
                /**
                 *
                 * @param {Uint8Array} chunk
                 * @param {*} controller
                 */
                async write(chunk, controller) {
					try{
                    hasIncomingData = true;
                    // remoteChunkCount++;
                    if (webSocket.readyState !== WS_READY_STATE_OPEN) {
                        controller.error("webSocket.readyState is not open, maybe close");
                    }
                    if (lvessHeader) {
                        webSocket.send(await new Blob([lvessHeader, chunk]).arrayBuffer());
                        lvessHeader = null;
                    } else {
                        // seems no need rate limit this, CF seems fix this??..
                        // if (remoteChunkCount > 20000) {
                        // 	// cf one package is 4096 byte(4kb),  4096 * 20000 = 80M
                        // 	await delay(1);
                        // }
                        webSocket.send(chunk);
                    }
					} catch (e) {
						}
                },
                abort(reason) {
                    console.error(`remoteConnection!.readable abort`, reason);
                },
            })
        )
        .catch((error) => {
            //console.error(`remoteSocketToWS has exception `, error.stack || error);
            safeCloseWebSocket(webSocket);
        });

    // seems is cf connect socket have error,
    // 1. Socket.closed will have error
    // 2. Socket.readable will be close without any data coming
    if (hasIncomingData === false && retry) {
        //log(`retry`);
        retry();
    }
}

/**
 *
 * @param {string} base64Str
 * @returns
 */
function base64ToArrayBuffer(base64Str) {
    if (!base64Str) {
        return { error: null };
    }
    try {
        // go use modified Base64 for URL rfc4648 which js atob not support
        base64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
        const decode = atob(base64Str);
        const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
        return { earlyData: arryBuffer.buffer, error: null };
    } catch (error) {
        return { error };
    }
}

/**
 * This is not real UUID validation
 * @param {string} uuid
 */
function isValidUUID(uuid) {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;
/**
 * Normally, WebSocket will not has exceptions when close.
 * @param {import("@cloudflare/workers-types").WebSocket} socket
 */
function safeCloseWebSocket(socket) {
    try {
        if (
            socket.readyState === WS_READY_STATE_OPEN ||
            socket.readyState === WS_READY_STATE_CLOSING
        ) {
            socket.close();
        }
    } catch (error) {
        console.error("safeCloseWebSocket error", error);
    }
}

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
    return (
        byteToHex[arr[offset + 0]] +
        byteToHex[arr[offset + 1]] +
        byteToHex[arr[offset + 2]] +
        byteToHex[arr[offset + 3]] +
        "-" +
        byteToHex[arr[offset + 4]] +
        byteToHex[arr[offset + 5]] +
        "-" +
        byteToHex[arr[offset + 6]] +
        byteToHex[arr[offset + 7]] +
        "-" +
        byteToHex[arr[offset + 8]] +
        byteToHex[arr[offset + 9]] +
        "-" +
        byteToHex[arr[offset + 10]] +
        byteToHex[arr[offset + 11]] +
        byteToHex[arr[offset + 12]] +
        byteToHex[arr[offset + 13]] +
        byteToHex[arr[offset + 14]] +
        byteToHex[arr[offset + 15]]
    ).toLowerCase();
}
function stringify(arr, offset = 0) {
    const uuid = unsafeStringify(arr, offset);
    if (!isValidUUID(uuid)) {
        throw TypeError("Stringified UUID is invalid");
    }
    return uuid;
}

/**
 *
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket
 * @param {ArrayBuffer} lvessResponseHeader
 * @param {(string)=> void} log
 */
async function handleUDPOutBound(webSocket, lvessResponseHeader, log) {
    let islvessHeaderSent = false;
    const transformStream = new TransformStream({
        start(controller) { },
        transform(chunk, controller) {
            // udp message 2 byte is the the length of udp data
            // TODO: this should have bug, beacsue maybe udp chunk can be in two websocket message
            for (let index = 0; index < chunk.byteLength;) {
                const lengthBuffer = chunk.slice(index, index + 2);
                const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
                const udpData = new Uint8Array(
                    chunk.slice(index + 2, index + 2 + udpPakcetLength)
                );
                index = index + 2 + udpPakcetLength;
                controller.enqueue(udpData);
            }
        },
        flush(controller) { },
    });

    // only handle dns udp for now
    transformStream.readable
        .pipeTo(
            new WritableStream({
                async write(chunk) {
                    const resp = await fetch(
                        dohURL, // dns server url
                        {
                            method: "POST",
                            headers: {
                                "content-type": "application/dns-message",
                            },
                            body: chunk,
                        }
                    );
                    const dnsQueryResult = await resp.arrayBuffer();
                    const udpSize = dnsQueryResult.byteLength;
                    // console.log([...new Uint8Array(dnsQueryResult)].map((x) => x.toString(16)));
                    const udpSizeBuffer = new Uint8Array([
                        (udpSize >> 8) & 0xff,
                        udpSize & 0xff,
                    ]);
                    if (webSocket.readyState === WS_READY_STATE_OPEN) {
                        log(`doh success and dns message length is ${udpSize}`);
                        if (islvessHeaderSent) {
                            webSocket.send(
                                await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer()
                            );
                        } else {
                            webSocket.send(
                                await new Blob([
                                    lvessResponseHeader,
                                    udpSizeBuffer,
                                    dnsQueryResult,
                                ]).arrayBuffer()
                            );
                            islvessHeaderSent = true;
                        }
                    }
                },
            })
        )
        .catch((error) => {
            log("dns udp has error" + error);
        });

    const writer = transformStream.writable.getWriter();

    return {
        /**
         *
         * @param {Uint8Array} chunk
         */
        write(chunk) {
            writer.write(chunk);
        },
    };
}

const at1 = 'QA==';
const vt1 = 'dmxl';
const vs1 = 'c3M6';
/**
 *
 * @param {string} userID
 * @param {string | null} hostName
 * @returns {string}
 */

async function createlvessSub(pathUUID, hostName){
	let port_http = [80, 8080, 2052,2082, 2086,2095];
    //let port_http1 = port_http[Math.floor(Math.random() * port_http.length)];
	let port = [443, 8443, 2053, 2083,2087,2096];
	//let port1 = port[Math.floor(Math.random() * port.length)];
    let lvessMainHttps = '';
	const url = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4KY";
	const urlwg = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/wg";
    const urlcf ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/CFDNS";
    const urlMTN ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MTN";
	const urlMCI ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MCI";
	const urlisMCI ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/isMCI";
	const urlAR_Num ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ArrayNum";
	const zwsp = "\u{200B}";
	const UMTN = '\u{1F15c}' + zwsp + '\u{1F163}' + zwsp + '\u{1F15D}';
	const UMTN_P = '\u{0627}' + zwsp + '\u{06CC}' + zwsp + '\u{0631}' + zwsp + '\u{0627}' + zwsp + '\u{0646}' + zwsp + '\u{0633}' + zwsp + '\u{0644}';
	const UMCI = '\u{1F1F2}' + zwsp + '\u{1F1E8}' + zwsp + '\u{1F1EE}';
	const UMCI_P = '\u{0647}' + zwsp + '\u{0645}' + zwsp + '\u{0631}' + zwsp + '\u{0627}' + zwsp + '\u{0647}' + '-' + zwsp + '\u{0627}' + zwsp + '\u{0648}' + zwsp + '\u{0644}';
	const UMKH = '\u{1F13C}' + zwsp + '\u{1F13A}' + zwsp + '\u{1F137}';
	const UMKH_P = '\u{0645}' + zwsp + '\u{062E}' + zwsp + '\u{0627}' + zwsp + '\u{0628}' + zwsp + '\u{00631}' + zwsp + '\u{0627}' + zwsp + '\u{062A}';
	const UMKHF =  '\u{1F13C}' + zwsp + '\u{1F13A}' + zwsp + '\u{1F137}';
	const UDOM_P = '\u{0648}' + zwsp + '\u{06CC}' + zwsp + '\u{0698}' + zwsp + '\u{0647}';	
	const UEPOVP = '\u{1F1EA}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F4}' + zwsp + '\u{1F1FB}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F3}';
	let Num_mkh = 8;
	let Num_mtn = 8;
	let Num_mci = 12;
	let Num_cf = 9;
	let Num_ntls = 4;
	// Regular expression to match IPv4 and IPv6
	const ipv4Pattern = /(?:\d{1,3}\.){3}\d{1,3}/;
	const ipv6Pattern = /\[?([A-Fa-f0-9:]+)\]?/;
	// Combine both patterns
	const ipPattern = new RegExp(`${ipv4Pattern.source}|${ipv6Pattern.source}`, 'g');
	
	const ipRegex = /"(\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b|\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b)"/g;
	const responseisMCI = await fetch(urlisMCI);
	const response = await fetch(url);
    const responsewg = await fetch(urlwg);
    
    const iMCI = await responseisMCI.text();
    const wg_confg = await responsewg.text();

	const text = await response.text();
	let cleanIPMKH =  text.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));

    const responseMTN = await fetch(urlMTN);
    const textMTN = await responseMTN.text();
	let cleanIPMTN1 =  textMTN.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPMTN1);
    let cleanIPMTN = cleanIPMTN1.slice(0, Num_mtn);
	
	const responseMCI = await fetch(urlMCI);
    const textMCI = await responseMCI.text();
	//let cleanIPMCI1 =  textMCI.match(ipRegex).map(ip => ip.replace(/\"/g, ''));
	let cleanIPMCI1 = textMCI.match(/"([^"]+)"/g).map(ip => {
	  // Remove quotes
	  ip = ip.replace(/\"/g, '');
	  // Check if the IP is in IPv6 format and add square brackets
	  if (ip.includes(':')) {
		return '[' + ip + ']'; // Enclose IPv6 in brackets
	  }
	  return ip; // Return IPv4 as is
	});
    shuffle(cleanIPMCI1);
    let cleanIPMCI = cleanIPMCI1.slice(0, Num_mci);
 
    const responsecf = await fetch(urlcf);
    let CNameIPs1 = (await responsecf.text()).split(',');
	let CNameIPs = CNameIPs1.slice(0, Num_cf);
	
    let restOfIPs = cleanIPMKH.filter(ip => !CNameIPs.includes(ip));
    shuffle(restOfIPs);
    
    let selectedRestOfIPs = restOfIPs.slice(0, Num_mkh);
    let selectedRestOfIPs8080 = restOfIPs.slice(Num_mkh+1, Num_mkh+Num_ntls+1);

    let cleanIP1 = selectedRestOfIPs;

	// Split the userIDs into an array
	let userIDArray = pathUUID.includes(',') ? pathUUID.split(',') : [pathUUID];
	// Prepare output array
	let output = [];
    let endIndex = Math.min(
        hostName.indexOf("-") !== -1 ? hostName.indexOf("-") : hostName.length,
        hostName.indexOf(".") !== -1 ? hostName.indexOf(".") : hostName.length
    );
    let prefix = randomUpperCase(hostName.substring(0, endIndex));
 
    let hostNewName = randomUpperCase(hostName);
	// Generate output string for each userID
    const commonUrlPart_https = `?encryption=none&alpn=h3&security=tls&sni=${hostNewName}&fp=chrome&type=ws&host=${hostNewName}&path=%2F${getRandomPath(16)}%3Fed%3D2560#`;
    const commonUrlPart_http = `?encryption=none&security=none&type=ws&host=${hostNewName}&path=%2F${getRandomPath(16)}%3Fed%3D2560#`;

    userIDArray.forEach((pathUUID) => {
		
		CNameIPs.forEach((address,in1) => {
            let port1 = port[0];
            lvessMainHttps += atob(vt1) + atob(vs1) + '//' + pathUUID + atob(at1) + address + ':' + port1 + commonUrlPart_https +  `${in1+1}` + ' -' + '\u{1F3c5}' + prefix.toUpperCase()+ ' -' + UDOM_P + '🇩🇪               '  + '💬Tel: @' + UEPOVP +`\n`;
			
		});
	});	
	
	
	userIDArray.forEach((pathUUID) => {

		cleanIPMCI.forEach((address, in2) => {
            let port1 = port[Math.floor(Math.random() * port.length)];
            lvessMainHttps += atob(vt1) + atob(vs1) + '//' + pathUUID + atob(at1) + address + ':' + port1 + commonUrlPart_https + `${in2+1+Num_cf}` + ' -' + '\u{1F947}' + '-'  + prefix.toUpperCase()  + UMCI_P + '🇩🇪               ' + '💬Tel: @' + UEPOVP +`\n`;
			
		});
	});
	
	if (iMCI.trim() === '1') {
    userIDArray.forEach((pathUUID) => {
        
        selectedRestOfIPs8080.forEach((address,inx) => {
            let port_http1 = port_http[Math.floor(Math.random() * port_http.length)];
            lvessMainHttps += atob(vt1) + atob(vs1) + '//' + pathUUID + atob(at1) + address + ':' + port_http1 + commonUrlPart_http + `${Num_mci+1+Num_cf+inx}` + ' -' + '\u{1F947}' + prefix.toUpperCase() + UMCI_P + 'NT' + '🇩🇪               ' + '💬Tel: @' + UEPOVP +`\n`;
        });
    });
	} else {
    console.error('isMCI is not 1. Actual value:', iMCI);
	}; 



	userIDArray.forEach((pathUUID) => {

		cleanIPMTN.forEach((address,in3) => {
            let port1 = port[Math.floor(Math.random() * port.length)];
            lvessMainHttps += atob(vt1) + atob(vs1) + '//' + pathUUID + atob(at1) + address + ':' + port1 + commonUrlPart_https + `${Num_mci+1+Num_ntls+Num_cf+in3}`  + ' -'  + '\u{1F948}' + prefix.toUpperCase() + '-' + UMTN_P + '🇩🇪               ' + '💬Tel: @' + UEPOVP +`\n`;
			
		});
	});


	userIDArray.forEach((pathUUID) => {

		cleanIP1.forEach((address,in4) => {
            let port1 = port[Math.floor(Math.random() * port.length)];
            lvessMainHttps += atob(vt1) + atob(vs1) + '//' + pathUUID + atob(at1) + address + ':' + port1 + commonUrlPart_https + `${Num_mci+1+Num_ntls+Num_cf+Num_mtn+in4}` + ' -'  + prefix.toUpperCase()  + '\u{1F396}' + '-' + UMKH_P + '🇩🇪               ' + '💬Tel: @' + UEPOVP +`\n`;
			
		});
	});


    //output.push(`${wg_confg}`);

    return (lvessMainHttps);
    
}

const CreateFraglvessConfig = async (env, pathUUID, hostName, urlf) => {
    let Configs = [];
    let Configs1 = [];
    let outbounds = [];
	let port_http = [80, 8080, 2052,2082, 2086,2095];
	let port_https = [443, 8443, 2053, 2083,2087,2096];
	const urlMCI = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
	const response = await fetch(urlMCI);
    const data = await response.json();
    const remoteDNS = data.remoteDNS;
    const localDNS = data.localDNS;
    const packets_mci = data.packets;
    const lengthMin_mci = data.lengthMin;
    const lengthMax_mci = data.lengthMax;
    const intervalMin_mci = data.intervalMin;
    const intervalMax_mci = data.intervalMax;
    const tcpKeepAliveIdle = data.tcpKeepAliveIdle;
    const urlMKB = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/paramsMKB";
    const response1 = await fetch(urlMKB);
    const data1 = await response1.json();
    const remoteDNS1 = data1.remoteDNS;
    const localDNS1 = data1.localDNS;
    const packets_mkh = data1.packets;
    const lengthMin_mkh = data1.lengthMin;
    const lengthMax_mkh = data1.lengthMax;
    const intervalMin_mkh = data1.intervalMin;
    const intervalMax_mkh = data1.intervalMax;
    const tcpKeepAliveIdle1 = data1.tcpKeepAliveIdle;
    const urlMTN = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/ParamsMTN";
    const response2 = await fetch(urlMTN);
    const data2 = await response2.json();
    const remoteDNS2 = data2.remoteDNS;
    const localDNS2 = data2.localDNS;
    const packets_mtn = data2.packets;
    const lengthMin_mtn = data2.lengthMin;
    const lengthMax_mtn = data2.lengthMax;
    const intervalMin_mtn = data2.intervalMin;
    const intervalMax_mtn = data2.intervalMax;
    const tcpKeepAliveIdle2 = data2.tcpKeepAliveIdle;
    let endIndex = Math.min(
        hostName.indexOf("-") !== -1 ? hostName.indexOf("-") : hostName.length,
        hostName.indexOf(".") !== -1 ? hostName.indexOf(".") : hostName.length
    );
    let prefix = randomUpperCase(hostName.substring(0, endIndex));
	const zwsp = "\u{200B}";
	const UMTN = '\u{1F15c}' + zwsp + '\u{1F163}' + zwsp + '\u{1F15D}';
	const UMTN_P = '\u{0627}' + zwsp + '\u{06CC}' + zwsp + '\u{0631}' + zwsp + '\u{0627}' + zwsp + '\u{0646}' + zwsp + '\u{0633}' + zwsp + '\u{0644}';
	const UMCI = '\u{1F1F2}' + zwsp + '\u{1F1E8}' + zwsp + '\u{1F1EE}';
	const UMCI_P = '\u{0647}' + zwsp + '\u{0645}' + zwsp + '\u{0631}' + zwsp + '\u{0627}' + zwsp + '\u{0647}' + '-' + zwsp + '\u{0627}' + zwsp + '\u{0648}' + zwsp + '\u{0644}';
	const UMKH = '\u{1F13C}' + zwsp + '\u{1F13A}' + zwsp + '\u{1F137}';
	const UMKH_P = '\u{0645}' + zwsp + '\u{062E}' + zwsp + '\u{0627}' + zwsp + '\u{0628}' + zwsp + '\u{00631}' + zwsp + '\u{0627}' + zwsp + '\u{062A}';
	const UMKHF =  '\u{1F13C}' + zwsp + '\u{1F13A}' + zwsp + '\u{1F137}';
	const UDOM_P = '\u{0648}' + zwsp + '\u{06CC}' + zwsp + '\u{0698}' + zwsp + '\u{0647}';	
	const UEPOVP = '\u{1F1EA}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F4}' + zwsp + '\u{1F1FB}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F3}';
        
	let ConfigTemp = structuredClone(ConfigJsonTemp1);
	delete ConfigTemp.observatory;
	//ConfigTemp.balancers.strategy.type = "leastPing";
	//fragment for mci
	let frag_mci = structuredClone(frag_Json);
	frag_mci.settings.fragment.packets = `${packets_mci}`;
	frag_mci.settings.fragment.length = `${lengthMin_mci}-${lengthMax_mci}`;
	frag_mci.settings.fragment.interval = `${intervalMin_mci}-${intervalMax_mci}`;
	
	let fragmciConfigTemp = structuredClone(ConfigJsonTemp1);
	delete fragmciConfigTemp.observatory;
	//fragmciConfigTemp.balancers.strategy.type = "leastPing";
	fragmciConfigTemp.remarks = '8-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + UMCI_P + '-' + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    fragmciConfigTemp.outbounds = [{ ...frag_mci}, ...fragmciConfigTemp.outbounds ];

	//fragment for mtn
	let frag_mtn = structuredClone(frag_Json);
	frag_mtn.settings.fragment.packets = `${packets_mtn}`;
	frag_mtn.settings.fragment.length = `${lengthMin_mtn}-${lengthMax_mtn}`;
	frag_mtn.settings.fragment.interval = `${intervalMin_mtn}-${intervalMax_mtn}`;
	
    let fragmtnConfigTemp = structuredClone(ConfigJsonTemp1);
	delete fragmtnConfigTemp.observatory;
	//fragmtnConfigTemp.balancers.strategy.type = "leastPing";
    fragmtnConfigTemp.remarks = '9-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + UMTN_P + '-' + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    fragmtnConfigTemp.outbounds = [{ ...frag_mtn}, ...fragmtnConfigTemp.outbounds ];
	
	//fragment for mkh
	let frag_mkh = structuredClone(frag_Json);
	frag_mkh.settings.fragment.packets = `${packets_mkh}`;
	frag_mkh.settings.fragment.length = `${lengthMin_mkh}-${lengthMax_mkh}`;
	frag_mkh.settings.fragment.interval = `${intervalMin_mkh}-${intervalMax_mkh}`;
	
    let fragmkhConfigTemp =  structuredClone(ConfigJsonTemp1);
	delete fragmkhConfigTemp.observatory;
	//fragmkhConfigTemp.balancers.strategy.type = "leastPing";
    fragmkhConfigTemp.remarks = '10-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + UMKH_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    fragmkhConfigTemp.outbounds = [{ ...frag_mkh}, ...fragmkhConfigTemp.outbounds ];

	
    const resolved = await resolveDNS(hostName);
	// frag clean ips
	const url_fragMKH_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/frag";
	const response_fragMKH_ip = await fetch(url_fragMKH_ip);
	const text_fragMKH_ip = await response_fragMKH_ip.text();
	let cleanIPfragMKH1 =  text_fragMKH_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMKH1);
	let outbound_lenth = 20;
    let cleanIPfragMKH = cleanIPfragMKH1.slice(0, outbound_lenth);
	
	// MCI clean ips
	const url_fragMCI_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MCI";
	const response_fragMCI_ip = await fetch(url_fragMCI_ip);
	const text_fragMCI_ip = await response_fragMCI_ip.text();
	let cleanIPfragMCI1 =  text_fragMCI_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMCI1);
    let cleanIPfragMCI = cleanIPfragMCI1.slice(0, outbound_lenth);
	
	// MTNI clean ips
	const url_fragMTN_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MTN";
	const response_fragMTN_ip = await fetch(url_fragMTN_ip);
	const text_fragMTN_ip = await response_fragMTN_ip.text();
	let cleanIPfragMTN1 =  text_fragMTN_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMTN1);   
    let cleanIPfragMTN = cleanIPfragMTN1.slice(0, outbound_lenth);
	
	// ipv4TZ clean ips
	const url_TZ_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4TZ";
	const response_TZ_ip = await fetch(url_TZ_ip);
	const text_TZ_ip = await response_TZ_ip.text();
	let cleanIPTZ1 =  text_TZ_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
	let best_IPTZ = cleanIPTZ1.slice(0, 1);
    shuffle(cleanIPTZ1);
    let cleanIPTZ = cleanIPTZ1.slice(0, outbound_lenth);
	cleanIPTZ = best_IPTZ.concat(cleanIPTZ);
	// CF clean Domains
	const url_fragCF_D ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/CFDNS";
	const response_fragCF_D = await fetch(url_fragCF_D);
	let text_fragCF_D = (await response_fragCF_D.text()).split(',');
    //shuffle(text_fragCF_D);
    let fragCF_D = text_fragCF_D.slice(0, outbound_lenth);
	// ipv6 clean Domains
	const url_ipv6 ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv6";
	const response_ipv6 = await fetch(url_ipv6);
	let text_ipv6 = (await response_ipv6.text()).split(',');
    let best_ipv6 = text_ipv6.slice(0, 1);
    shuffle(text_ipv6);
    let Nipv6 = text_ipv6.slice(0, outbound_lenth);
    Nipv6 = best_ipv6.concat(Nipv6);
		// ipv4TZ clean ips
	const url_wp_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/WP";
	const response_wp_ip = await fetch(url_wp_ip);
	const text_wp_ip = await response_wp_ip.text();
	let cleanIPwp1 =  text_wp_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    let best_IPwp = cleanIPwp1.slice(0, 1);
    shuffle(cleanIPwp1);
    let cleanIPwp = cleanIPwp1.slice(0, outbound_lenth);   //cleanIPwp = best_IPwp;
    //cleanIPwp = cleanIPwp.concat(best_IPwp);
    cleanIPwp = best_IPwp.concat(cleanIPwp);
    cleanIPfragMKH.forEach((addr, index) => {
		
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		let prixyfragOutbound = structuredClone(fragOutbound);
        prixyfragOutbound.tag += `_${index + 1}`;
		prixyfragOutbound.settings.vnext[0].address = addr;
		prixyfragOutbound.settings.vnext[0].users[0].id = pathUUID;
		prixyfragOutbound.settings.vnext[0].port = port;
		prixyfragOutbound.streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		prixyfragOutbound.streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		prixyfragOutbound.streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		
        outbounds.push({...prixyfragOutbound});		
    });
	//MKH_frag
    let bestPingFragmkhConfig = clone(fragmkhConfigTemp);	
    bestPingFragmkhConfig.outbounds = [...outbounds, ...bestPingFragmkhConfig.outbounds];
	//MTN_frag
	let bestPingFragmtnConfig = clone(fragmtnConfigTemp);
	let newOutboundmtn = JSON.parse(JSON.stringify(outbounds)); // Copy each element
	//delete newOutboundmtn.streamSettings.sockopt;
	outbounds.forEach((outbound, inx) => {
	  newOutboundmtn[inx].settings.vnext[0].address = cleanIPfragMTN[inx];
	});
	bestPingFragmtnConfig.outbounds.unshift(...newOutboundmtn);
		//Normal_mci
    let bestPingmciConfig = clone(ConfigTemp);
	let newOutboundmci2 = JSON.parse(JSON.stringify(outbounds));
	outbounds.forEach((outbound, indx1) => {
		newOutboundmci2[indx1].settings.vnext[0].address = cleanIPfragMCI[indx1];
		delete newOutboundmci2[indx1].streamSettings.sockopt;	
	 });
	bestPingmciConfig.remarks =  '2-' + '\u{1F396}' + prefix.toUpperCase() + '-N' + '-' + UMCI_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingmciConfig.outbounds.unshift(...newOutboundmci2);
	//Normal_mtn
    let bestPingConfig = clone(ConfigTemp);
	let newOutboundmtnfrag = JSON.parse(JSON.stringify(outbounds));
	outbounds.forEach((outbound, indx1) => {
		newOutboundmtnfrag[indx1].settings.vnext[0].address = cleanIPfragMTN[indx1];
		delete newOutboundmtnfrag[indx1].streamSettings.sockopt;
	 });
	bestPingConfig.remarks =  '3-' + '\u{1F396}' + prefix.toUpperCase() + '-N' + '-' + UMTN_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingConfig.outbounds.unshift(...newOutboundmtnfrag);
	//Normal_mkh
    let bestPingnormalConfig = clone(ConfigTemp);
	let newOutbound = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx1) => {
		newOutbound[indx1].settings.vnext[0].address = cleanIPTZ[indx1];
		delete newOutbound[indx1].streamSettings.sockopt;
	 });
	bestPingnormalConfig.remarks =  '4-' + '\u{1F396}' + prefix.toUpperCase() + '-N' + '-' + UMKH_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingnormalConfig.outbounds.unshift(...newOutbound);
	//Normal_cf
    let bestPingnormal3Config = clone(ConfigTemp);
	let newOutboundn3 = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx2) => {
		newOutboundn3[indx2].settings.vnext[0].address = fragCF_D[indx2];
		delete newOutboundn3[indx2].streamSettings.sockopt;
	 });
	bestPingnormal3Config.remarks =  '1-' + '\u{1F396}' + prefix.toUpperCase() + '-N' + '-' + UDOM_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingnormal3Config.outbounds.unshift(...newOutboundn3);
	 	//cf_frag
	//let fragCF_DF = shuffle(fragCF_D);
    let bestPingcf_fragConfig = clone(fragmkhConfigTemp);
	let newOutboundcf = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx3) => {
		newOutboundcf[indx3].settings.vnext[0].address = fragCF_D[indx3];
	 });
	bestPingcf_fragConfig.remarks =  '7-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + UDOM_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingcf_fragConfig.outbounds.unshift(...newOutboundcf);
	//MCI_frag
	let bestPingFragmciConfig = clone(fragmciConfigTemp);
	let newOutboundmci = JSON.parse(JSON.stringify(outbounds));
	outbounds.forEach((outbound, indx) => {
		newOutboundmci[indx].settings.vnext[0].address = cleanIPfragMCI[indx];
	 });
	 bestPingFragmciConfig.outbounds.unshift(...newOutboundmci);

	//Normal_ipv6
    let bestPingnormalipv6Config = clone(ConfigTemp);
	let newOutboundipv6 = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, inx2) => {
		newOutboundipv6[inx2].settings.vnext[0].address = Nipv6[inx2];
		delete newOutboundipv6[inx2].streamSettings.sockopt;
	 });
	bestPingnormalipv6Config.remarks =  '5-' + '\u{1F396}' + prefix.toUpperCase() + '-N' + '-' + 'IPv6' + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingnormalipv6Config.outbounds.unshift(...newOutboundipv6);
	 	//ipv6_frag
	//let fragCF_DF = shuffle(fragCF_D);
    let bestPingcf_fragipv6Config = clone(fragmkhConfigTemp);
	let newOutboundfragipv6 = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, inx3) => {
		newOutboundfragipv6[inx3].settings.vnext[0].address = Nipv6[inx3];
	 });
	bestPingcf_fragipv6Config.remarks =  '11-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + 'IPv6' + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingcf_fragipv6Config.outbounds.unshift(...newOutboundfragipv6); 
	//Wrp
    const url_WG = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/WG_pears";
    const response_WG = await fetch(url_WG);
    const data_WG = await response_WG.json();
    const SecretKey = data_WG.map(item => item.PrivateKey);
    const PublicKey = data_WG.map(item => item.PublicKey);
    const Reserved = data_WG.map(item => item.Reserved);
    let my_warp_confg = clone(mywarp);
    cleanIPwp.forEach((addr, inx4) => {
		let wrpOutbound_IR = structuredClone(mywarp_Outbound_IR);
        //let wrpOutbound = structuredClone(mywarp_Outbound);
        //wrpOutbound.tag += `_${inx4 + 1}`;
		wrpOutbound_IR.tag = "MAIN";
        wrpOutbound_IR.tag += `_${outbound_lenth - (inx4)}`;
        //wrpOutbound.streamSettings.sockopt.dialerProxy = wrpOutbound_IR.tag;
		//wrpOutbound.settings.peers[0].endpoint = cleanIPwp[inx4];
        wrpOutbound_IR.settings.peers[0].endpoint = cleanIPwp[outbound_lenth - (inx4)];
        //wrpOutbound_IR.settings.peers[inx4].publicKey = PublicKey[inx4];
/*        wrpOutbound_IR.settings.peers.push({
            endpoint: addr,
            publicKey: PublicKey[inx4]
        })*/
        //wrpOutbound_IR.settings.secretKey = SecretKey[1];
        //wrpOutbound_IR.settings.reserved = JSON.parse(Reserved[1]);
        //my_warp_confg.outbounds.unshift({...wrpOutbound},{...wrpOutbound_IR});
		my_warp_confg.outbounds.unshift({...wrpOutbound_IR});
    });			
	my_warp_confg.remarks =  '13-' + '\u{1F396}' + prefix.toUpperCase() + '-' + 'WRP' + '-'  + '🇮🇷' + '\u{000A}' +'💬Tel: @' + UEPOVP;
//Wow
    let my_wow_confg = clone(mywarp);
    cleanIPwp.forEach((addr, inx4) => {
		
		let wowOutbound_IR = structuredClone(mywarp_Outbound_IR);
        let wowOutbound = structuredClone(mywarp_Outbound);
        wowOutbound.tag += `_${inx4 + 1}`;
        wowOutbound_IR.tag += `_${inx4 + 1}`;
        wowOutbound.streamSettings.sockopt.dialerProxy = wowOutbound_IR.tag;
		//wrpOutbound.settings.peers[0].endpoint = cleanIPwp[inx4];
        wowOutbound_IR.settings.peers[0].endpoint = cleanIPwp[inx4];
        my_wow_confg.outbounds.unshift({...wowOutbound},{...wowOutbound_IR});
		//my_warp_confg.outbounds.unshift({...wrpOutbound_IR});			
    });

	my_wow_confg.remarks =  '12-' + '\u{1F396}' + prefix.toUpperCase() + '-' + 'WOW' + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;	
	//Normal_mci_NT
    let bestPingmciNTConfig = clone(ConfigTemp);
	let newOutboundmciNT2 = JSON.parse(JSON.stringify(outbounds));
	outbounds.forEach((outbound, indx1) => {
		let port_hp = port_http[Math.floor(Math.random() * port_http.length)];
		newOutboundmciNT2[indx1].settings.vnext[0].address = fragCF_D[indx1];//cleanIPfragMCI[indx1];
		newOutboundmciNT2[indx1].settings.vnext[0].port = port_hp;
		delete newOutboundmciNT2[indx1].streamSettings.sockopt;
		newOutboundmciNT2[indx1].streamSettings.security = "none";
		delete newOutboundmciNT2[indx1].streamSettings.tlsSettings;
		
	 });
	bestPingmciNTConfig.remarks =  '6-' + '\u{1F396}' + prefix.toUpperCase() + '-NT' + '-' + UMCI_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingmciNTConfig.outbounds.unshift(...newOutboundmciNT2);
    //let outputJson
	
	let my_serverless_conf = clone(serverless);
	my_serverless_conf.remarks = '14-' + '\u{1F396}' + prefix.toUpperCase() + '-' + 'youtube & X' + '-'  + '🇮🇷' + '\u{000A}' +'💬Tel: @' + UEPOVP;
   const uuidParts = pathUUID.split('-');
   const datesegment = uuidParts[4];
   const ConfigType = parseInt(datesegment.substring(10,12), 10);

  try{
  if (ConfigType === 96) {
    return JSON.stringify([

	    bestPingnormal3Config, bestPingmciConfig, bestPingConfig, bestPingnormalConfig, bestPingnormalipv6Config, bestPingmciNTConfig, bestPingcf_fragConfig, bestPingFragmciConfig, bestPingFragmtnConfig, bestPingFragmkhConfig, bestPingcf_fragipv6Config, my_wow_confg, my_warp_confg, my_serverless_conf
	  ], null, 2) 
    } else if (ConfigType < 9) {
    return JSON.stringify([
        bestPingnormal3Config, bestPingmciConfig, bestPingConfig, bestPingnormalConfig, bestPingnormalipv6Config, bestPingmciNTConfig, bestPingcf_fragConfig, bestPingFragmciConfig, bestPingFragmtnConfig, bestPingFragmkhConfig, bestPingcf_fragipv6Config
    ], null, 2)
  }
    } catch (error) {
    console.error('Error generating configurations:', error);
    return []; // Fallback empty array
  }
};

const CreateFraglvessConfigif = async (env, pathUUID, hostName, urlf) => {
    let Configs = [];
    let Configs1 = [];
    let outbounds = [];
	let port_http = [80, 8080, 2052,2082, 2086,2095];
	let port_https = [443, 8443, 2053, 2083,2087,2096];
	const urlMCI = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
	const response = await fetch(urlMCI);
    const data = await response.json();
    const remoteDNS = data.remoteDNS;
    const localDNS = data.localDNS;
    const packets_mci = data.packets;
    const lengthMin_mci = data.lengthMin;
    const lengthMax_mci = data.lengthMax;
    const intervalMin_mci = data.intervalMin;
    const intervalMax_mci = data.intervalMax;
    const tcpKeepAliveIdle = data.tcpKeepAliveIdle;
    
    const urlMKB = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/paramsMKB";
    const response1 = await fetch(urlMKB);
    const data1 = await response1.json();
    const remoteDNS1 = data1.remoteDNS;
    const localDNS1 = data1.localDNS;
    const packets_mkh = data1.packets;
    const lengthMin_mkh = data1.lengthMin;
    const lengthMax_mkh = data1.lengthMax;
    const intervalMin_mkh = data1.intervalMin;
    const intervalMax_mkh = data1.intervalMax;
    const tcpKeepAliveIdle1 = data1.tcpKeepAliveIdle;
    const urlMTN = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/ParamsMTN";
    const response2 = await fetch(urlMTN);
    const data2 = await response2.json();
    const remoteDNS2 = data2.remoteDNS;
    const localDNS2 = data2.localDNS;
    const packets_mtn = data2.packets;
    const lengthMin_mtn = data2.lengthMin;
    const lengthMax_mtn = data2.lengthMax;
    const intervalMin_mtn = data2.intervalMin;
    const intervalMax_mtn = data2.intervalMax;
    const tcpKeepAliveIdle2 = data2.tcpKeepAliveIdle;
    let endIndex = Math.min(
        hostName.indexOf("-") !== -1 ? hostName.indexOf("-") : hostName.length,
        hostName.indexOf(".") !== -1 ? hostName.indexOf(".") : hostName.length
    );
    let prefix = randomUpperCase(hostName.substring(0, endIndex));
    
	const zwsp = "\u{200B}";
	const UEPOVP = '\u{1F1EA}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F4}' + zwsp + '\u{1F1FB}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F3}'; 
        
	let ConfigTemp = structuredClone(ConfigJsonTemp1);
	delete ConfigTemp.burstObservatory;
	ConfigTemp.routing.balancers[0].strategy.type = "leastPing";
	
	//fragment for mkh
	let frag_mkh = structuredClone(frag_Json);
	frag_mkh.settings.fragment.packets = `${packets_mkh}`;
	frag_mkh.settings.fragment.length = `${lengthMin_mkh}-${lengthMax_mkh}`;
	frag_mkh.settings.fragment.interval = `${intervalMin_mkh}-${intervalMax_mkh}`;
	
    let fragmkhConfigTemp =  structuredClone(ConfigJsonTemp1);
	delete fragmkhConfigTemp.burstObservatory;
	fragmkhConfigTemp.routing.balancers[0].strategy.type = "leastPing";
    fragmkhConfigTemp.remarks = '9-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    fragmkhConfigTemp.outbounds = [{ ...frag_mkh}, ...fragmkhConfigTemp.outbounds ];

	
    const resolved = await resolveDNS(hostName);
	// frag clean ips
	const url_fragMKH_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/frag";
	const response_fragMKH_ip = await fetch(url_fragMKH_ip);
	const text_fragMKH_ip = await response_fragMKH_ip.text();
	let cleanIPfragMKH1 =  text_fragMKH_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMKH1);
	let outbound_lenth = 5;
    let cleanIPfragMKH = cleanIPfragMKH1.slice(0, outbound_lenth);
	
	// MCI clean ips
	const url_fragMCI_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MCI";
	const response_fragMCI_ip = await fetch(url_fragMCI_ip);
	const text_fragMCI_ip = await response_fragMCI_ip.text();
	let cleanIPfragMCI1 =  text_fragMCI_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMCI1);
    let cleanIPfragMCI = cleanIPfragMCI1.slice(0, outbound_lenth);
	
	// MTNI clean ips
	const url_fragMTN_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MTN";
	const response_fragMTN_ip = await fetch(url_fragMTN_ip);
	const text_fragMTN_ip = await response_fragMTN_ip.text();
	let cleanIPfragMTN1 =  text_fragMTN_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMTN1);   
    let cleanIPfragMTN = cleanIPfragMTN1.slice(0, outbound_lenth);
	
	// ipv4TZ clean ips
	const url_TZ_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4TZ";
	const response_TZ_ip = await fetch(url_TZ_ip);
	const text_TZ_ip = await response_TZ_ip.text();
	let cleanIPTZ1 =  text_TZ_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
	let best_IPTZ = cleanIPTZ1.slice(0, 1);
    shuffle(cleanIPTZ1);
    let cleanIPTZ = cleanIPTZ1.slice(0, outbound_lenth);
	cleanIPTZ = best_IPTZ.concat(cleanIPTZ);
	// CF clean Domains
	const url_fragCF_D ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/CFDNS";
	const response_fragCF_D = await fetch(url_fragCF_D);
	let text_fragCF_D = (await response_fragCF_D.text()).split(',');
    shuffle(text_fragCF_D);
    let fragCF_D = text_fragCF_D.slice(0, outbound_lenth);
	// ipv6 clean Domains
	const url_ipv6 ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv6";
	const response_ipv6 = await fetch(url_ipv6);
	let text_ipv6 = (await response_ipv6.text()).split(',');
    shuffle(text_fragCF_D);
    let Nipv6 = text_ipv6.slice(0, outbound_lenth);

	let All_ips =  Nipv6.concat(cleanIPfragMKH.concat(cleanIPfragMCI.concat(cleanIPTZ.concat(cleanIPfragMTN.concat(fragCF_D)))));
	
    All_ips.forEach((addr, index) => {
		
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		let prixyfragOutbound = structuredClone(fragOutbound);
        prixyfragOutbound.tag += `_${index + 1}`;
		prixyfragOutbound.settings.vnext[0].address = addr;
		prixyfragOutbound.settings.vnext[0].users[0].id = pathUUID;
		prixyfragOutbound.settings.vnext[0].port = port;
		prixyfragOutbound.streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		prixyfragOutbound.streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		prixyfragOutbound.streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		
        outbounds.push({...prixyfragOutbound});		
    });

	 //cf_frag
    let bestPingcf_fragConfig = clone(fragmkhConfigTemp);
	let newOutboundcf = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx3) => {
		newOutboundcf[indx3].settings.vnext[0].address = All_ips[indx3];
	 });
	bestPingcf_fragConfig.remarks =  '1-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingcf_fragConfig.outbounds.unshift(...newOutboundcf);

    let outputJson = JSON.stringify(bestPingcf_fragConfig, null, 2);
	return outputJson;
};

const CreateFraglvessConfigi = async (env, pathUUID, hostName, urlf) => {
    let Configs = [];
    let Configs1 = [];
    let outbounds = [];
	let port_http = [80, 8080, 2052,2082, 2086,2095];
	let port_https = [443, 8443, 2053, 2083,2087,2096];
	const urlMCI = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
	const response = await fetch(urlMCI);
    const data = await response.json();
    const remoteDNS = data.remoteDNS;
    const localDNS = data.localDNS;
    const packets_mci = data.packets;
    const lengthMin_mci = data.lengthMin;
    const lengthMax_mci = data.lengthMax;
    const intervalMin_mci = data.intervalMin;
    const intervalMax_mci = data.intervalMax;
    const tcpKeepAliveIdle = data.tcpKeepAliveIdle;
    
    const urlMKB = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/paramsMKB";
    const response1 = await fetch(urlMKB);
    const data1 = await response1.json();
    const remoteDNS1 = data1.remoteDNS;
    const localDNS1 = data1.localDNS;
    const packets_mkh = data1.packets;
    const lengthMin_mkh = data1.lengthMin;
    const lengthMax_mkh = data1.lengthMax;
    const intervalMin_mkh = data1.intervalMin;
    const intervalMax_mkh = data1.intervalMax;
    const tcpKeepAliveIdle1 = data1.tcpKeepAliveIdle;
    const urlMTN = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/ParamsMTN";
    const response2 = await fetch(urlMTN);
    const data2 = await response2.json();
    const remoteDNS2 = data2.remoteDNS;
    const localDNS2 = data2.localDNS;
    const packets_mtn = data2.packets;
    const lengthMin_mtn = data2.lengthMin;
    const lengthMax_mtn = data2.lengthMax;
    const intervalMin_mtn = data2.intervalMin;
    const intervalMax_mtn = data2.intervalMax;
    const tcpKeepAliveIdle2 = data2.tcpKeepAliveIdle;
    let endIndex = Math.min(
        hostName.indexOf("-") !== -1 ? hostName.indexOf("-") : hostName.length,
        hostName.indexOf(".") !== -1 ? hostName.indexOf(".") : hostName.length
    );
    let prefix = randomUpperCase(hostName.substring(0, endIndex));
    
	const zwsp = "\u{200B}";
	const UEPOVP = '\u{1F1EA}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F4}' + zwsp + '\u{1F1FB}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F3}'; 
        
	let ConfigTemp = structuredClone(ConfigJsonTemp1);
	
	//fragment for mkh
	let frag_mkh = structuredClone(frag_Json);
	frag_mkh.settings.fragment.packets = `${packets_mkh}`;
	frag_mkh.settings.fragment.length = `${lengthMin_mkh}-${lengthMax_mkh}`;
	frag_mkh.settings.fragment.interval = `${intervalMin_mkh}-${intervalMax_mkh}`;
	
    let fragmkhConfigTemp =  structuredClone(ConfigJsonTemp1);
    fragmkhConfigTemp.remarks = '9-' + '\u{1F396}' + prefix.toUpperCase() + '-F' + '-' + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    fragmkhConfigTemp.outbounds = [{ ...frag_mkh}, ...fragmkhConfigTemp.outbounds ];

	
    const resolved = await resolveDNS(hostName);
	// frag clean ips
	const url_fragMKH_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/frag";
	const response_fragMKH_ip = await fetch(url_fragMKH_ip);
	const text_fragMKH_ip = await response_fragMKH_ip.text();
	let cleanIPfragMKH1 =  text_fragMKH_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMKH1);
	let outbound_lenth = 5;
    let cleanIPfragMKH = cleanIPfragMKH1.slice(0, outbound_lenth);
	
	// MCI clean ips
	const url_fragMCI_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MCI";
	const response_fragMCI_ip = await fetch(url_fragMCI_ip);
	const text_fragMCI_ip = await response_fragMCI_ip.text();
	let cleanIPfragMCI1 =  text_fragMCI_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMCI1);
    let cleanIPfragMCI = cleanIPfragMCI1.slice(0, outbound_lenth);
	
	// MTNI clean ips
	const url_fragMTN_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MTN";
	const response_fragMTN_ip = await fetch(url_fragMTN_ip);
	const text_fragMTN_ip = await response_fragMTN_ip.text();
	let cleanIPfragMTN1 =  text_fragMTN_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMTN1);   
    let cleanIPfragMTN = cleanIPfragMTN1.slice(0, outbound_lenth);
	
	// ipv4TZ clean ips
	const url_TZ_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4TZ";
	const response_TZ_ip = await fetch(url_TZ_ip);
	const text_TZ_ip = await response_TZ_ip.text();
	let cleanIPTZ1 =  text_TZ_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
	let best_IPTZ = cleanIPTZ1.slice(0, 1);
    shuffle(cleanIPTZ1);
    let cleanIPTZ = cleanIPTZ1.slice(0, outbound_lenth);
	cleanIPTZ = best_IPTZ.concat(cleanIPTZ);
	// CF clean Domains
	const url_fragCF_D ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/CFDNS";
	const response_fragCF_D = await fetch(url_fragCF_D);
	let text_fragCF_D = (await response_fragCF_D.text()).split(',');
    shuffle(text_fragCF_D);
    let fragCF_D = text_fragCF_D.slice(0, outbound_lenth);
	// ipv6 clean Domains
	const url_ipv6 ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv6";
	const response_ipv6 = await fetch(url_ipv6);
	let text_ipv6 = (await response_ipv6.text()).split(',');
    shuffle(text_fragCF_D);
    let Nipv6 = text_ipv6.slice(0, outbound_lenth);

	let All_ips =  Nipv6.concat(cleanIPfragMKH.concat(cleanIPfragMCI.concat(cleanIPTZ.concat(cleanIPfragMTN.concat(fragCF_D)))));
	
    All_ips.forEach((addr, index) => {
		
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		let prixyfragOutbound = structuredClone(fragOutbound);
        prixyfragOutbound.tag += `_${index + 1}`;
		prixyfragOutbound.settings.vnext[0].address = addr;
		prixyfragOutbound.settings.vnext[0].users[0].id = pathUUID;
		prixyfragOutbound.settings.vnext[0].port = port;
		prixyfragOutbound.streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		prixyfragOutbound.streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		prixyfragOutbound.streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		
        outbounds.push({...prixyfragOutbound});		
    });

	//Normal_mkh
    let bestPingnormalConfig = clone(ConfigTemp);
	let newOutbound = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx1) => {
		newOutbound[indx1].settings.vnext[0].address = All_ips[indx1];
		delete newOutbound[indx1].streamSettings.sockopt;
	 });
	bestPingnormalConfig.remarks =  '1-' + '\u{1F396}' + prefix.toUpperCase() + '-N' + '-' + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
    bestPingnormalConfig.outbounds.unshift(...newOutbound);

    let outputJson = JSON.stringify(bestPingnormalConfig, null, 2);
	return outputJson;
};

const CreateFraglvessConfig1 = async (pathUUID, env, hostName, urlf) => {

    let Configs = [];
    let Configs1 = [];
    let outbounds = [];
	let port_http = [80, 8080, 2052,2082, 2086,2095];
	let port_https = [443, 8443, 2053, 2083,2087,2096];
	const zwsp = "\u{200B}";
	const UMTN = '\u{1F15c}' + zwsp + '\u{1F163}' + zwsp + '\u{1F15D}';
	const UMTN_P = '\u{0627}' + zwsp + '\u{06CC}' + zwsp + '\u{0631}' + zwsp + '\u{0627}' + zwsp + '\u{0646}' + zwsp + '\u{0633}' + zwsp + '\u{0644}';
	const UMCI = '\u{1F1F2}' + zwsp + '\u{1F1E8}' + zwsp + '\u{1F1EE}';
	const UMCI_P = '\u{0647}' + zwsp + '\u{0645}' + zwsp + '\u{0631}' + zwsp + '\u{0627}' + zwsp + '\u{0647}' + '-' + zwsp + '\u{0627}' + zwsp + '\u{0648}' + zwsp + '\u{0644}';
	const UMKH = '\u{1F13C}' + zwsp + '\u{1F13A}' + zwsp + '\u{1F137}';
	const UMKH_P = '\u{0645}' + zwsp + '\u{062E}' + zwsp + '\u{0627}' + zwsp + '\u{0628}' + zwsp + '\u{00631}' + zwsp + '\u{0627}' + zwsp + '\u{062A}';
	const UMKHF =  '\u{1F13C}' + zwsp + '\u{1F13A}' + zwsp + '\u{1F137}';
	const UDOM_P = '\u{0648}' + zwsp + '\u{06CC}' + zwsp + '\u{0698}' + zwsp + '\u{0647}';	
	const UEPOVP = '\u{1F1EA}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F4}' + zwsp + '\u{1F1FB}' + zwsp + '\u{1F1F5}' + zwsp + '\u{1F1F3}';

const urlMCI = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/PramsMCI";
const response = await fetch(urlMCI);
    const data = await response.json();
    const remoteDNS = data.remoteDNS;
    const localDNS = data.localDNS;
    const packets_mci = data.packets;
    const lengthMin_mci = data.lengthMin;
    const lengthMax_mci = data.lengthMax;
    const intervalMin_mci = data.intervalMin;
    const intervalMax_mci = data.intervalMax;
    const tcpKeepAliveIdle = data.tcpKeepAliveIdle;
    const urlMKB = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/paramsMKB";
    const response1 = await fetch(urlMKB);
        const data1 = await response1.json();
        const remoteDNS1 = data1.remoteDNS;
        const localDNS1 = data1.localDNS;
        const packets_mkh = data1.packets;
        const lengthMin_mkh = data1.lengthMin;
        const lengthMax_mkh = data1.lengthMax;
        const intervalMin_mkh = data1.intervalMin;
        const intervalMax_mkh = data1.intervalMax;
        const tcpKeepAliveIdle1 = data1.tcpKeepAliveIdle;
        const urlMTN = "https://raw.githubusercontent.com/MrMalekfar/Lists/main/ParamsMTN";
        const response2 = await fetch(urlMTN);
        const data2 = await response2.json();
        const remoteDNS2 = data2.remoteDNS;
        const localDNS2 = data2.localDNS;
        const packets_mtn = data2.packets;
        const lengthMin_mtn = data2.lengthMin;
        const lengthMax_mtn = data2.lengthMax;
        const intervalMin_mtn = data2.intervalMin;
        const intervalMax_mtn = data2.intervalMax;
        const tcpKeepAliveIdle2 = data2.tcpKeepAliveIdle;
        let endIndex = Math.min(
            hostName.indexOf("-") !== -1 ? hostName.indexOf("-") : hostName.length,
            hostName.indexOf(".") !== -1 ? hostName.indexOf(".") : hostName.length
        );
        let prefix = randomUpperCase(hostName.substring(0, endIndex));
	//fragment for mci
	let frag_mci = structuredClone(frag_Json);
	frag_mci.settings.fragment.packets = `${packets_mci}`;
	frag_mci.settings.fragment.length = `${lengthMin_mci}-${lengthMax_mci}`;
	frag_mci.settings.fragment.interval = `${intervalMin_mci}-${intervalMax_mci}`;
	
	let fragmciConfigTemp = structuredClone(ConfigJsonTemp);
	delete fragmciConfigTemp.burstObservatory;
	delete fragmciConfigTemp.observatory;
	delete fragmciConfigTemp.routing.balancers;
	fragmciConfigTemp.remarks = '2-' + '🇩🇪' + prefix + '-mci🇩🇪                              💬Tel: @' + UEPOVP; // Change the remark
    fragmciConfigTemp.outbounds = [{ ...frag_mci}, ...fragmciConfigTemp.outbounds ];

	//fragment for mtn
	let frag_mtn = structuredClone(frag_Json);
	frag_mtn.settings.fragment.packets = `${packets_mtn}`;
	frag_mtn.settings.fragment.length = `${lengthMin_mtn}-${lengthMax_mtn}`;
	frag_mtn.settings.fragment.interval = `${intervalMin_mtn}-${intervalMax_mtn}`;
	
    let fragmtnConfigTemp = structuredClone(ConfigJsonTemp);
    fragmtnConfigTemp.remarks = '3-' + '🇩🇪' + prefix + '-mtn🇩🇪                              💬Tel: @' + UEPOVP; // Change the remark
    fragmtnConfigTemp.outbounds = [{ ...frag_mtn}, ...fragmtnConfigTemp.outbounds ];
	
	//fragment for mkh
	let frag_mkh = structuredClone(frag_Json);
	frag_mkh.settings.fragment.packets = `${packets_mkh}`;
	frag_mkh.settings.fragment.length = `${lengthMin_mkh}-${lengthMax_mkh}`;
	frag_mkh.settings.fragment.interval = `${intervalMin_mkh}-${intervalMax_mkh}`;
	
    let fragmkhConfigTemp =  structuredClone(ConfigJsonTemp);
    fragmkhConfigTemp.remarks = '1-' + '🇩🇪' + prefix + '-mkh🇩🇪                              💬Tel: @' + UEPOVP; // Change the remark
    fragmkhConfigTemp.outbounds = [{ ...frag_mkh}, ...fragmkhConfigTemp.outbounds ];

	let Num_mkh = 8;
	let Num_mkh_F = 8;
	let Num_mtn = 8;
	let Num_mci = 12;
	let Num_cf = 12;
    const resolved = await resolveDNS(hostName);
	// frag clean ips
	const url_fragMKH_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/frag";
	const response_fragMKH_ip = await fetch(url_fragMKH_ip);
	const text_fragMKH_ip = await response_fragMKH_ip.text();
	let cleanIPfragMKH1 =  text_fragMKH_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMKH1);
    let cleanIPfragMKH = cleanIPfragMKH1.slice(0, Num_mkh_F);
	
	// MCI clean ips
	const url_fragMCI_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MCI";
	const response_fragMCI_ip = await fetch(url_fragMCI_ip);
	const text_fragMCI_ip = await response_fragMCI_ip.text();
	let cleanIPfragMCI1 =  text_fragMCI_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMCI1);
	
    let cleanIPfragMCI = cleanIPfragMCI1.slice(0, Num_mci);
	
	// MTNI clean ips
	const url_fragMTN_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4MTN";
	const response_fragMTN_ip = await fetch(url_fragMTN_ip);
	const text_fragMTN_ip = await response_fragMTN_ip.text();
	let cleanIPfragMTN1 =  text_fragMTN_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
    shuffle(cleanIPfragMTN1);   
    let cleanIPfragMTN = cleanIPfragMTN1.slice(0, Num_mtn);
	
	// ipv4TZ clean ips
	const url_TZ_ip ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/ipv4TZ";
	const response_TZ_ip = await fetch(url_TZ_ip);
	const text_TZ_ip = await response_TZ_ip.text();
	let cleanIPTZ1 =  text_TZ_ip.match(/"([^"]+)"/g).map(ip => ip.replace(/\"/g, ''));
	let best_IPTZ = cleanIPTZ1.slice(0, 1);
    shuffle(cleanIPTZ1);
    let cleanIPTZ = cleanIPTZ1.slice(0, Num_mkh);
	cleanIPTZ = best_IPTZ.concat(cleanIPTZ);
	
	// CF clean Domains
	const url_fragCF_D ="https://raw.githubusercontent.com/MrMalekfar/Lists/main/CFDNS";
	const response_fragCF_D = await fetch(url_fragCF_D);
	let text_fragCF_D = (await response_fragCF_D.text()).split(',');
    //shuffle(text_fragCF_D);
    let fragCF_D = text_fragCF_D.slice(0, Num_cf);

	let ConfigTemp = structuredClone(ConfigJsonTemp);
	delete ConfigTemp.burstObservatory;
	delete ConfigTemp.observatory;
	delete ConfigTemp.routing.balancers;
		//cf
	let Config_cf_Temp = []; // Initialize as an empty array

	fragCF_D.forEach((addr, index1) => {
		let configClone_cf = structuredClone(ConfigTemp); // Clone the template config for each IP address
		delete configClone_cf.burstObservatory;
		delete configClone_cf.observatory;
		delete configClone_cf.routing.balancers;
		let prixy_cf_outbound = structuredClone(fragOutbound);
		delete prixy_cf_outbound.streamSettings.sockopt;
		configClone_cf.outbounds = [{...prixy_cf_outbound}, ...configClone_cf.outbounds];
		// Modify the cloned configuration
		configClone_cf.remarks = `${index1+1}` + '-' + '\u{1F3c5}' + prefix.toUpperCase() + '-' + UDOM_P + '-' + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		configClone_cf.outbounds[0].settings.vnext[0].address = addr;
		configClone_cf.outbounds[0].settings.vnext[0].users[0].id = pathUUID;
		configClone_cf.outbounds[0].settings.vnext[0].port = port;
		configClone_cf.outbounds[0].streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		configClone_cf.outbounds[0].streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		configClone_cf.outbounds[0].streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		// Add the modified clone to the array
		Config_cf_Temp.push(configClone_cf);
	});
	
		//mci
	let Config_mci_Temp = []; // Initialize as an empty array

	cleanIPfragMCI.forEach((addr, index2) => {
		let configClone_mci = structuredClone(ConfigTemp); // Clone the template config for each IP address
		delete configClone_mci.burstObservatory;
		delete configClone_mci.observatory;
		delete configClone_mci.routing.balancers;
		let prixy_mci_outbound = structuredClone(fragOutbound);
		delete prixy_mci_outbound.streamSettings.sockopt;
		configClone_mci.outbounds = [{...prixy_mci_outbound}, ...configClone_mci.outbounds];
		// Modify the cloned configuration
		configClone_mci.remarks = `${index2+1+Num_cf}` + '-' + '\u{1F947}' + prefix.toUpperCase() + '-' + UMCI_P +  '-' + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		configClone_mci.outbounds[0].settings.vnext[0].address = addr;
		configClone_mci.outbounds[0].settings.vnext[0].users[0].id = pathUUID;
		configClone_mci.outbounds[0].settings.vnext[0].port = port;
		configClone_mci.outbounds[0].streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		configClone_mci.outbounds[0].streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		configClone_mci.outbounds[0].streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		Config_mci_Temp.push(configClone_mci);
	});	
	
	//mtn
	let Config_mtn_Temp = []; // Initialize as an empty array

	cleanIPfragMTN.forEach((addr, index3) => {
		let configClone_mtn = structuredClone(ConfigTemp); // Clone the template config for each IP address
		delete configClone_mtn.burstObservatory;
		delete configClone_mtn.observatory;
		delete configClone_mtn.routing.balancers;
		let prixy_mtn_outbound = structuredClone(fragOutbound);
		delete prixy_mtn_outbound.streamSettings.sockopt;
		configClone_mtn.outbounds = [{...prixy_mtn_outbound}, ...configClone_mtn.outbounds];

		// Modify the cloned configuration
	configClone_mtn.remarks = `${index3+1+Num_cf+Num_mci}` + '-' + '\u{1F948}' + prefix.toUpperCase() + '-' + UMTN_P + '-' + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		configClone_mtn.outbounds[0].settings.vnext[0].address = addr;
		configClone_mtn.outbounds[0].settings.vnext[0].users[0].id = pathUUID;
		configClone_mtn.outbounds[0].settings.vnext[0].port = port;
		configClone_mtn.outbounds[0].streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		configClone_mtn.outbounds[0].streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		configClone_mtn.outbounds[0].streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		Config_mtn_Temp.push(configClone_mtn);
	});	
	
	//mkh
	let Config_mkh_Temp = []; // Initialize as an empty array

	cleanIPTZ.forEach((addr, index4) => {
		let configClone = structuredClone(ConfigTemp); // Clone the template config for each IP address
		delete configClone.burstObservatory;
		delete configClone.observatory;
		delete configClone.routing.balancers;
		let prixy_mkh_utbound = structuredClone(fragOutbound);
		delete prixy_mkh_utbound.streamSettings.sockopt;
		configClone.outbounds = [{...prixy_mkh_utbound}, ...configClone.outbounds];
		// Modify the cloned configuration
		configClone.remarks = `${index4+1+Num_cf+Num_mci+Num_mtn}` + '-' + '\u{1F396}'+ prefix.toUpperCase() + '-' + UMKH_P + '-'  + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		configClone.outbounds[0].settings.vnext[0].address = addr;
		configClone.outbounds[0].settings.vnext[0].users[0].id = pathUUID;
		configClone.outbounds[0].settings.vnext[0].port = port;
		configClone.outbounds[0].streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		configClone.outbounds[0].streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		configClone.outbounds[0].streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		Config_mkh_Temp.push(configClone);
	});
	
		//mkh_frag
	let ConfigTemp_frag = structuredClone(fragmkhConfigTemp);

	let Config_mkh_Temp_frag = []; // Initialize as an empty array

	cleanIPfragMKH.forEach((addr, index5) => {
		let configClone_mkh_frag = structuredClone(ConfigTemp_frag); // Clone the template config for each IP address

		let prixy_mkh_frag_utbound = structuredClone(fragOutbound);
		configClone_mkh_frag.outbounds = [{...prixy_mkh_frag_utbound}, ...configClone_mkh_frag.outbounds];
		// Modify the cloned configuration
		configClone_mkh_frag.remarks = `${index5+1+Num_mkh+Num_cf+Num_mci+Num_mtn}` + '-' + '\u{1F949}' + prefix + '-' + UMKH_P +'-F' + '🇩🇪' + '\u{000A}' +'💬Tel: @' + UEPOVP;
		let port = port_https[Math.floor(Math.random() * port_https.length)];
		configClone_mkh_frag.outbounds[0].settings.vnext[0].address = addr;
		configClone_mkh_frag.outbounds[0].settings.vnext[0].users[0].id = pathUUID;
		configClone_mkh_frag.outbounds[0].settings.vnext[0].port = port;
		configClone_mkh_frag.outbounds[0].streamSettings.tlsSettings.serverName = randomUpperCase(hostName);
		configClone_mkh_frag.outbounds[0].streamSettings.wsSettings.headers.Host = randomUpperCase(hostName);
		configClone_mkh_frag.outbounds[0].streamSettings.wsSettings.path = `/${getRandomPath(16)}?ed=2560`;
		Config_mkh_Temp_frag.push(configClone_mkh_frag);
	});
	
	//MKH_frag
    let bestPingFragmkhConfig = clone(fragmkhConfigTemp);	
    bestPingFragmkhConfig.outbounds = [...outbounds, ...bestPingFragmkhConfig.outbounds];
	//MTN_frag
	let bestPingFragmtnConfig = clone(fragmtnConfigTemp);
	let newOutboundmtn = JSON.parse(JSON.stringify(outbounds)); // Copy each element
	outbounds.forEach((outbound, inx) => {
	  newOutboundmtn[inx].settings.vnext[0].address = cleanIPfragMTN[inx];
	});
	bestPingFragmtnConfig.outbounds.unshift(...newOutboundmtn);
	//Normal_1
/*     let bestPingConfig = clone(ConfigTemp);
	bestPingConfig.remarks =  '4-' + '🇩🇪' + prefix + '-Normal' + '🇩🇪                              💬Tel: @EpoVPN',
    bestPingConfig.outbounds = [...outbounds, ...bestPingConfig.outbounds]; */
	//Normal_2
    let bestPingnormalConfig = clone(ConfigTemp);
	let newOutbound = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx1) => {
		newOutbound[indx1].settings.vnext[0].address = cleanIPTZ[indx1];
	 });
	bestPingnormalConfig.remarks =  '5-' + '🇩🇪' + prefix + '-Normal' + '🇩🇪                              💬Tel: @EpoVPN',
    bestPingnormalConfig.outbounds.unshift(...newOutbound);
	//Normal_3
    let bestPingnormal3Config = clone(ConfigTemp);
	let newOutboundn3 = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx2) => {
		newOutboundn3[indx2].settings.vnext[0].address = fragCF_D[indx2];
	 });
	bestPingnormal3Config.remarks =  '6-' + '🇩🇪' + prefix + '-Normal' + '🇩🇪                              💬Tel: @EpoVPN',
    bestPingnormal3Config.outbounds.unshift(...newOutboundn3);
	 	//cf_frag
    let bestPingcf_fragConfig = clone(fragmkhConfigTemp);
	let newOutboundcf = JSON.parse(JSON.stringify(outbounds));
		outbounds.forEach((outbound, indx3) => {
		newOutboundcf[indx3].settings.vnext[0].address = fragCF_D[indx3];
	 });
	bestPingcf_fragConfig.remarks =  '7-' + '🇩🇪' + prefix + '-Normal' + '🇩🇪                              💬Tel: @EpoVPN',
    bestPingcf_fragConfig.outbounds.unshift(...newOutboundcf);
	//MCI_frag
	let bestPingFragmciConfig = clone(fragmciConfigTemp);
	let newOutboundmci = JSON.parse(JSON.stringify(outbounds));
	outbounds.forEach((outbound, indx) => {
		newOutboundmci[indx].settings.vnext[0].address = cleanIPfragMCI[indx];
	 });
	 bestPingFragmciConfig.outbounds.unshift(...newOutboundmci);

      //let outputJson = JSON.stringify((((Config_mtn_Temp.concat(Config_mkh_Temp)).concat(Config_mci_Temp)).concat(Config_cf_Temp)).concat(Config_mkh_Temp_frag), null, 2);
      let outputJson = JSON.stringify((((Config_mkh_Temp_frag.concat(Config_mkh_Temp)).concat(Config_mtn_Temp)).concat(Config_mci_Temp)).concat(Config_cf_Temp), null, 2);
    
    return outputJson
};
// Function to check if an IP is IPv4
function isIPv4(ip) {
    return !ip.includes(':');
}

// Function to shuffle an array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

const clone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
}

const randomUpperCase = (str) => {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        result += Math.random() < 0.5 ? str[i].toUpperCase() : str[i];
    }
    return result;
};

const getRandomPath = (length) => {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789---___";
    let result = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
};

const resolveDNS = async (domain) => {
    const dohURLv4 = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`;
    const dohURLv6 = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=AAAA`;

    try {
        const [ipv4Response, ipv6Response] = await Promise.all([
            fetch(dohURLv4, { headers: { accept: "application/dns-json" } }),
            fetch(dohURLv6, { headers: { accept: "application/dns-json" } }),
        ]);

        const ipv4Addresses = await ipv4Response.json();
        const ipv6Addresses = await ipv6Response.json();

        const ipv4 = ipv4Addresses.Answer
            ? ipv4Addresses.Answer.map((record) => record.data)
            : [];
        const ipv6 = ipv6Addresses.Answer
            ? ipv6Addresses.Answer.map((record) => record.data)
            : [];

        return { ipv4, ipv6 };
    } catch (error) {
        console.error("Error resolving DNS:", error);
    }
};
const ConfigJsonTemp = {      
              dns: {
				hosts: {
				  "domain:googleapis.cn": "googleapis.com"
				},
				servers: [
				  {
					address: "fakedns",
					domains: [
					  "geosite:cn"
					]
				  },
				  "2001:4860:4860::8888",
				  {
					address: "2620:119:35::35",
					domains: [
					  "geosite:cn",
					  "geosite:geolocation-cn"
					],
					expectIPs: [
					  "geoip:cn"
					],
					port: 53
				  }
				]
			  },
			  fakedns: [
				{
				  ipPool: "198.18.0.0/15",
				  poolSize: 10000
				}
			  ],
            inbounds: [
                {
                    listen: "127.0.0.1",
                    port: 10808,
                    protocol: "socks",
                    settings: {
                        auth: "noauth",
                        udp: true,
                        userLevel: 8,
                    },
                    sniffing: {
                        destOverride: ["http", "tls", "fakedns"],
                        enabled: true,
						routeOnly: false
                    },
                    tag: "socks",
                },
                {
                    listen: "127.0.0.1",
                    port: 10809,
                    protocol: "http",
                    settings: {
                        userLevel: 8,
                    },
                    tag: "http",
                },
                {
                    listen: "127.0.0.1",
                    port: 10853,
                    protocol: "dokodemo-door",
                    settings: {
                      address: "2001:4860:4860::8888",
                      network: "tcp,udp",
                      port: 53
                    },
                    tag: "dns-in"
                  }
            ],
            log: {
                loglevel: "warning",
            },
            outbounds: [
                {
                    protocol: "freedom",
                    settings: {
                        domainStrategy: "UseIP",
                    },
                    tag: "direct",
                },
                {
                    protocol: "blackhole",
                    settings: {
                        response: {
                            type: "http",
                        },
                    },
                    tag: "block",
                },
				{
				  protocol: "dns",
				  tag: "dns-out"
				}
            ],
            remarks: '5-'  + '\u{1F396}'+ 'Normal1' + '-' + 'mkh' + '-'  + '🇩🇪' +'💬Tel: @' + 'UEPOVP',	
            routing: {
                domainStrategy: "IPIfNonMatch",
                rules: [
					 {
						inboundTag: [
						  "dns-in"
						],
						outboundTag: "dns-out"
					  },
					  {
						ip: [
						  "2001:4860:4860::8888"
						],
						outboundTag: "AutoOut",
						port: "53"
					  },
					  {
						ip: [
						  "2620:119:35::35"
						],
						outboundTag: "direct",
						port: "53"
					  },
					  {
						domain: [
						  "domain:googleapis.cn"
						],
						outboundTag: "AutoOut"
					  },
					  {
						ip: [
						  "geoip:private"
						],
						outboundTag: "direct"
					  },
                      {
                        type: "field",
                        outboundTag: "direct",
                        domain: [
                          "geosite:private"
                        ]
                      },
					  {
						ip: [
						  "geoip:ir"
						],
						outboundTag: "direct"
					  },
/* 					  {
						domain: [
						  "geosite:category-ir"
						],
						outboundTag: "direct"
					  }, */
					  {
						domain: [
						  //"geosite:geolocation-cn"
						"domain:.ir",
						"workers.dev"					
						],
						outboundTag: "direct"
					  },
                      {
                        "type": "field",
                        "outboundTag": "direct",
                        "domain": [
                          "geosite:ir"
                        ]
                      },
					  {
						domain: [
						"geosite:category-ads-all"
						//"geosite:category-porn"
						],
						outboundTag: "block"
					  },
					 {
					   ip: [
						 "10.10.34.34",
						 "10.10.34.35",
						 "10.10.34.36"
					   ],
					   outboundTag: "block",
					   type: "field"
					 },
					  {
						outboundTag: "AutoOut",
						port: "0-65535"
					  }
                ],
                balancers: [
                    {
                        tag: "all",
                        selector: ["AutoOut"],
                        strategy: {
                            //type: "leastPing",
							type: "leastLoad",
                        },
						fallbackTag: "AutoOut_1",
                    },
                ],
            },
/*             observatory: {
                probeInterval: "2m",
                probeURL: "http://edge.microsoft.com/captiveportal/generate_204",
                subjectSelector: ["AutoOut"],
                EnableConcurrency: true,
            }, */
			burstObservatory: {
				subjectSelector: ["AutoOut"],
				pingConfig: {
				destination: "http://edge.microsoft.com/captiveportal/generate_204",
				interval: "30m",
				connectivity: "",//The URL used to detect local network connectivity. An empty string means not to detect local network connectivity.
				timeout: "3s",
				sampling: 3 //The number of recent probe results to keep + 1.
				},
			},
            stats: {},
        };
		
const ConfigJsonTemp1 = {      
    dns: {
        "hosts": {
          "geosite:category-ads-all": "127.0.0.1",
          "domain:googleapis.cn": "googleapis.com",
          "dns.alidns.com": [
            "223.5.5.5",
            "223.6.6.6",
            "2400:3200::1",
            "2400:3200:baba::1"
          ],
          "one.one.one.one": [
            "1.1.1.1",
            "1.0.0.1",
            "2606:4700:4700::1111",
            "2606:4700:4700::1001"
          ],
          "dot.pub": [
            "1.12.12.12",
            "120.53.53.53"
          ],
          "dns.google": [
            "8.8.8.8",
            "8.8.4.4",
            "2001:4860:4860::8888",
            "2001:4860:4860::8844"
          ],
          "dns.quad9.net": [
            "9.9.9.9",
            "149.112.112.112",
            "2620:fe::fe",
            "2620:fe::9"
          ],
          "common.dot.dns.yandex.net": [
            "77.88.8.8",
            "77.88.8.1",
            "2a02:6b8::feed:0ff",
            "2a02:6b8:0:1::feed:0ff"
          ]
        },
        "servers": [
            "2001:4860:4860::8888", // Google DNS (IPv6)
            "8.8.8.8",              // Google DNS (IPv4)
          {
            "address": "2620:119:35::35",
            "domains": [
              "domain:ir",
              "geosite:category-ir"
            ],
            "skipFallback": true
          },
          "1.1.1.1"               // Cloudflare DNS (IPv4) as fallback
        ]
      },
            inbounds: [
                {
                    listen: "127.0.0.1",
                    port: 10808,
                    protocol: "socks",
                    settings: {
                        auth: "noauth",
                        udp: true,
                        userLevel: 8,
                    },
                    sniffing: {
                        destOverride: ["http", "tls", "fakedns"],
                        enabled: true,
						routeOnly: false
                    },
                    tag: "socks",
                },
                {
                    listen: "127.0.0.1",
                    port: 10809,
                    protocol: "http",
                    settings: {
                        userLevel: 8,
                    },
                    tag: "http",
                },
                {
                    listen: "127.0.0.1",
                    port: 10853,
                    protocol: "dokodemo-door",
                    settings: {
                      address: "2001:4860:4860::8888",
                      network: "tcp,udp",
                      port: 53
                    },
                    tag: "dns-in"
                  }
            ],
            log: {
                loglevel: "warning",
            },
            outbounds: [
                {
                    protocol: "freedom",
                    settings: {
                        domainStrategy: "UseIP",
                    },
                    tag: "direct",
                },
                {
                    protocol: "blackhole",
                    settings: {
                        response: {
                            type: "http",
                        },
                    },
                    tag: "block",
                },
				{
				  protocol: "dns",
				  tag: "dns-out"
				}
            ],
            remarks: '5-'  + '\u{1F396}'+ 'Normal1' + '-' + 'mkh' + '-'  + '🇩🇪' +'💬Tel: @' + 'UEPOVP',	
            routing: {
                domainStrategy: "IPIfNonMatch",
                rules: [
					 {
						inboundTag: [
						  "dns-in"
						],
						//outboundTag: "dns-out"
						 balancerTag: "all",
						 type: "field"
					  },
					  {
						ip: [
                            "2001:4860:4860::8888", // Google DNS (IPv6)
                            "8.8.8.8",              // Google DNS (IPv4)
						],
						balancerTag: "all",
						port: "53",
						type: "field"
					  },
					  {
						ip: [
						  "2620:119:35::35"
						],
						outboundTag: "direct",
						port: "53",
						type: "field"
					  },
                      {
                        type: "field",
                        port: "443",
                        network: "udp",
                        outboundTag: "block"
                      },
                      {
                        type: "field",
                        outboundTag: "direct",
                        ip: [
                          "8.8.8.8"
                        ]
                      },
                      {
                        type: "field",
                        outboundTag: "direct",
                        protocol: [
                          "bittorrent"
                        ]
                      },
					  {
						ip: [
						  "geoip:private"
						],
						outboundTag: "direct",
						type: "field"
					  },
                      {
                        type: "field",
                        outboundTag: "direct",
                        domain: [
                          "geosite:private"
                        ]
                      },
					  {
						outboundTag: "direct",
						type: "field",                        
						ip: [
						  "geoip:ir"
						]
					  },
                      {
                        type: "field",
                        outboundTag: "direct",
                        domain: [
                          "geosite:category-ir"
                        ]
                      },
					  {
						domain: [
						"domain:.ir",
						"workers.dev"
                        //"iran-gamecenter-host.com"					
						],
						outboundTag: "direct",
						type: "field"
					  },
					  {
						domain: [
						"geosite:category-ads-all"
						 //"geosite:category-porn"
						],
						outboundTag: "block",
						type: "field"
					  },
					 {
					   ip: [
						 "10.10.34.34",
						 "10.10.34.35",
						 "10.10.34.36"
					   ],
					   outboundTag: "block",
					   type: "field"
					 },
					  {
						balancerTag: "all",
						port: "0-65535"
					  }
                ],
                balancers: [
                    {
                        tag: "all",
                        selector: ["AutoOut"],
                        strategy: {
                            //type: "leastPing",
							type: "leastLoad",
                        },
						fallbackTag: "AutoOut_1",
                    },
                ],
            },
            observatory: {
                probeInterval: "2m",
                probeURL: "http://edge.microsoft.com/captiveportal/generate_204",
                subjectSelector: ["AutoOut"],
                EnableConcurrency: true,
            },
			burstObservatory: {
				subjectSelector: ["AutoOut"],
				pingConfig: {
				destination: "http://edge.microsoft.com/captiveportal/generate_204",
				interval: "30m",
				connectivity: "",//The URL used to detect local network connectivity. An empty string means not to detect local network connectivity.
				timeout: "3s",
				sampling: 3
				},
			},
            stats: {},
        };
	//fragJson
	const frag_Json = {
        protocol: "freedom",
        settings: {
            fragment: {
                packets: "tlshello",
                length: "10-20",
                interval: "10-20",
            },
			noises:[
				{
					"type":"base64",
					"packet":"7nQBAAABAAAAAAAABnQtcmluZwZtc2VkZ2UDbmV0AAABAAE=",
					"delay":"10-16"
				},
				{
					"type":"rand",
					"packet":"10-20",
					"delay":"10-16"
				},
				{
					"type":"str",
					"packet":"hiGFW",
					"delay":"10-16"
				}
				]
        },
        streamSettings: {
			network: "tcp",
			security: "",
            sockopt: {
                TcpNoDelay: true,
				mark: 255
            },
        },
        tag: "fragment"		
    }; 
	
		const fragOutbound = {
			mux: {
			concurrency: -1,
			enabled: false,
			xudpConcurrency: 8,
			xudpProxyUDP443: ""
			},
            protocol: atob(vt1) + atob('c3M='),
            settings: {
                vnext: [
                    {
                        address: "google.com",
                        port: 1,
                        users: [
                            {
                                encryption: "none",
                                flow: "",
                                id: userID,
                                level: 8,
                                security: "auto",
                            },
                        ],
                    },
                ],
            },
            streamSettings: {
                network: "ws",
                security: "tls",
				  sockopt: {
				  dialerproxy: "fragment"
				},
                tlsSettings: {
                    allowInsecure: false,
                    //alpn: ["h3", "h2", "http/1.1"],
					alpn: ["h2", "http/1.1"],
                    fingerprint: "randomized",
                    publicKey: "",
                    serverName: "google.com",
                    shortId: "",
                    show: false,
                    spiderX: "",
                },
                wsSettings: {
                    headers: {
                        Host: "google.com",
						//User-Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0"
                    },
                    path: "/",
                },
            },
            tag: "AutoOut",
        };

        const mywarp = {
            dns: {
                hosts: {
                  "geosite:category-porn": "127.0.0.1",
                  "domain:googleapis.cn": "googleapis.com"
                },
                servers: [
                  "1.1.1.1",
				  "1.0.0.1",
				  "8.8.8.8",
				  "8.8.4.4"
                ]
              },
             inbounds: [
               {
                 listen: "127.0.0.1",
                 port: 10808,
                 protocol: "socks",
                 settings: {
                   auth: "noauth",
                   udp: true,
                   userLevel: 8
                 },
                 sniffing: {
                   destOverride: [
                     "http",
                     "tls"
                   ],
                   enabled: true,
                   routeOnly: false
                 },
                 tag: "socks"
               },
               {
                 listen: "127.0.0.1",
                 port: 10809,
                 protocol: "http",
                 settings: {
                   userLevel: 8
                 },
                 tag: "http"
               },
/*                {
                 listen: "127.0.0.1",
                 port: 10853,
                 protocol: "dokodemo-door",
                 settings: {
                   address: "2001:4860:4860::8888",
                   network: "tcp,udp",
                   port: 53
                 },
                 tag: "dns-in"
               } */
             ],
             log: {
                loglevel: "warning",
            },
             outbounds: [
               {
                 protocol: "freedom",
                 settings: {
					 "noises":[
					  {
						"type":"base64",
						"packet":"7nQBAAABAAAAAAAABnQtcmluZwZtc2VkZ2UDbmV0AAABAAE=",
						"delay":"10-16"
					  },
					  {
						"type":"rand",
						"packet":"10-20",
						"delay":"10-16"
					  },
					  {
						"type":"str",
						"packet":"hiGFW",
						"delay":"10-16"
					  }
					]
				},
                 tag: "direct"
               },
               {
                 protocol: "blackhole",
                 settings: {
                   response: {
                     type: "http"
                   }
                 },
                 tag: "block"
               }
             ],
             remarks: '6-'  + '\u{1F396}' + '-' + 'BEST' + '-'  + '🇩🇪' +'💬Tel: @' + 'UEPOVP',
            routing: {
               domainStrategy: "IPIfNonMatch",
               rules: [
                 {
                   ip: [
                  "1.1.1.1",
				  "1.0.0.1",
				  "8.8.8.8",
				  "8.8.4.4"
                   ],
                   balancerTag: "all",
				   //outboundTag: "MAIN_1",
                   port: "53",
				   type: "field"
                 },
					  {
						ip: [
						  "geoip:private"
						],
						outboundTag: "direct",
						type: "field"
					  },
					  {
						ip: [
						  "geoip:ir"
						],
						outboundTag: "direct",
						type: "field"
					  },
					  {
						domain: [
						  "geosite:category-ir"
						],
						outboundTag: "direct",
						type: "field"
					  },
					  {
						domain: [
						  //"geosite:geolocation-cn"
						"domain:ir",
						"workers.dev"					
						],
						outboundTag: "direct",
						type: "field"
					  },
					  {
						domain: [
						"geosite:category-ads-all"
						 //"geosite:category-porn"
						],
						outboundTag: "block",
						 type: "field"
					  },
                 {
                   ip: [
                     "10.10.34.34",
                     "10.10.34.35",
                     "10.10.34.36"
                   ],
                   outboundTag: "block",
				   type: "field"
                 },
 				  {
					balancerTag: "all",
                    //outboundTag: "MAIN",
					"port": "0-65535"
				  } 
               ],
                 balancers: [
                    {
                        tag: "all",
                        selector: ["MAIN"],
                        strategy: {
                            //type: "leastPing",
							//type: "roundRobin",
                            type: "leastLoad"
                            //timout: 2
                        }//,
						//fallbackTag: "MAIN_20",
                    },
                ],
            }, 
   /*          observatory: {
                subjectSelector: ["MAIN"],
                probeUrl: "https://www.google.com/generate_204",
                probeInterval: "10s",
                enableConcurrency: false
            }, */
 			burstObservatory: {
				subjectSelector: ["MAIN"],
				pingConfig: {
				//destination: "http://edge.microsoft.com/captiveportal/generate_204",
                destination: "https://connectivitycheck.gstatic.com/generate_204",
				interval: "10m",
				connectivity: "",//The URL used to detect local network connectivity. An empty string means not to detect local network connectivity.
				timeout: "3s",
				sampling: 3
				},
			},
   };

   const mywarp_Outbound = {
/*         mux: {
          concurrency: -1,
          enabled: false,
          xudpConcurrency: 8,
          xudpProxyUDP443: ""
        }, */
        protocol: "wireguard",
        settings: {
          address: [
          "172.16.0.2/32",
/* 		  "2606:4700:110:870f:e85:971d:9ace:1848/128" */
          ],
          mtu: 1283,
          peers: [
            {
              endpoint: "188.114.97.14:1018",
               publicKey: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo="
            }
          ],
          reserved: [
          109,
          58,
          139
          ],
		workers: 2,
           secretKey: "qKe72iLyuEdi66xJpWhlU8DLu4rQpH2QAfUVKfZDYmQ=",
        keepAlive: 10
		},
 		streamSettings: {
            sockopt: {
				dialerProxy: "IR",
                tcpKeepAliveIdle: 100,
                tcpNoDelay: true,
                },
            }, 
        tag: "MAIN",
   };

   const mywarp_Outbound_IR = {
/*     mux: {
      concurrency: -1,
      enabled: false,
      xudpConcurrency: 8,
      xudpProxyUDP443: ""
    }, */
    protocol: "wireguard",
    settings: {
      address: [
      "172.16.0.2/32",
/*       "2606:4700:110:870f:e85:971d:9ace:1848/128" */
      ],
      mtu: 1283,
      domainStrategy: "ForceIPv6v4",
      peers: [
        {
          endpoint: "188.114.97.14:1018",
          publicKey: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
          allowedIPs: [
            "0.0.0.0/0",
            "::/0"
        ]
        }
      ],
      reserved: [
      105,
      223,
      144
      ],
	workers: 2,
      secretKey: "wPT65i3QzNdIAXDT4+W4o/OzllZQzgpwN+v4JUENhWQ=",
    keepAlive: 10
	},
/* 	proxySettings: {
        tag: "MAIN_1",
    transportLayer: true
    }, */
/*    healthCheck: {
        enable: true,
        interval: 5,
        timeout: 2,
        destination: "8.8.8.8:53"
      },*/
    tag: "IR"
};

const serverless = {
    "remarks": "14-\uD83C\uDF96TEST1-youtube \u0026 X-\uD83C\uDDEE\uD83C\uDDF7\n\uD83D\uDCACTel: @\uD83C\uDDEA\u200B\uD83C\uDDF5\u200B\uD83C\uDDF4\u200B\uD83C\uDDFB\u200B\uD83C\uDDF5\u200B\uD83C\uDDF3",
    "log": {
      "access": "",
      "error": "",
      "loglevel": "none",
      "dnsLog": false
    },
    "dns": {
      "tag": "dns",
      "hosts": {
        "cloudflare.com": [
          "104.16.123.96",
          "104.16.133.229"
        ],
        "cloudflare-dns.com": [
          "172.67.73.38",
          "104.19.155.92",
          "172.67.73.163",
          "104.18.155.42",
          "104.16.124.175",
          "104.16.248.249",
          "104.16.249.249",
          "162.159.129.53",
          "104.26.13.8"
        ],
        "domain:youtube.com": [
          "google.com"
        ]
      },
      "servers": [
        "https://cloudflare-dns.com/dns-query"
      ]
    },
    "inbounds": [
      {
        "domainOverride": [
          "http",
          "tls"
        ],
        "protocol": "socks",
        "tag": "socks-in",
        "listen": "127.0.0.1",
        "port": 10808,
        "settings": {
          "auth": "noauth",
          "udp": true,
          "userLevel": 8
        },
        "sniffing": {
          "enabled": true,
          "destOverride": [
            "http",
            "tls"
          ]
        }
      },
      {
        "protocol": "http",
        "tag": "http-in",
        "listen": "127.0.0.1",
        "port": 10809,
        "settings": {
          "userLevel": 8
        },
        "sniffing": {
          "enabled": true,
          "destOverride": [
            "http",
            "tls"
          ]
        }
      }
    ],
    "outbounds": [
      {
        "protocol": "freedom",
        "tag": "fragment-out",
        "domainStrategy": "UseIP",
        "sniffing": {
          "enabled": true,
          "destOverride": [
            "http",
            "tls"
          ]
        },
        "settings": {
          "fragment": {
            "packets": "tlshello",
            "length": "6",
            "interval": "0"
          },
          "noises": [
            {
              "type": "base64",
              "packet": "7nQBAAABAAAAAAAABnQtcmluZwZtc2VkZ2UDbmV0AAABAAE=",
              "delay": "10-16"
            },
            {
              "type": "rand",
              "packet": "10-20",
              "delay": "10-16"
            },
            {
              "type": "str",
              "packet": "hiGFW",
              "delay": "10-16"
            }
          ]
        },
        "streamSettings": {
          "sockopt": {
              "dialerProxy": "fragment-out1"
          }
        }
      },
      
          {
        "protocol": "freedom",
        "tag": "fragment-out1",
        "domainStrategy": "UseIP",
        "sniffing": {
          "enabled": true,
          "destOverride": [
            "http",
            "tls"
          ]
        },
        "settings": {
          "fragment": {
            "packets": "1-3",
            "length": "517",
            "interval": "1"
          },
          "noises": [
            {
              "type": "base64",
              "packet": "7nQBAAABAAAAAAAABnQtcmluZwZtc2VkZ2UDbmV0AAABAAE=",
              "delay": "10-16"
            },
            {
              "type": "rand",
              "packet": "10-20",
              "delay": "10-16"
            },
            {
              "type": "str",
              "packet": "hiGFW",
              "delay": "10-16"
            }
          ]
        },
        "streamSettings": {
          "sockopt": {
            "dialerProxy": "fragment-out2"
          }
        }
      },
      
          {
        "protocol": "freedom",
        "tag": "fragment-out2",
        "domainStrategy": "UseIP",
        "sniffing": {
          "enabled": true,
          "destOverride": [
            "http",
            "tls"
          ]
        },
        "settings": {
          "fragment": {
            "packets": "tlshello",
            "length": "10-20",
            "interval": "10-20"
          },
          "noises": [
            {
              "type": "base64",
              "packet": "7nQBAAABAAAAAAAABnQtcmluZwZtc2VkZ2UDbmV0AAABAAE=",
              "delay": "10-16"
            },
            {
              "type": "rand",
              "packet": "10-20",
              "delay": "10-16"
            },
            {
              "type": "str",
              "packet": "hiGFW",
              "delay": "10-16"
            }
          ]
        },
        "streamSettings": {
          "sockopt": {
            "tcpNoDelay": true,
            "tcpKeepAliveIdle": 100,
            "mark": 255,
            "domainStrategy": "UseIP"
          }
        }
      },
      
      {
        "protocol": "dns",
        "tag": "dns-out"
      }
    ],
    "policy": {
      "levels": {
        "8": {
          "connIdle": 300,
          "downlinkOnly": 1,
          "handshake": 4,
          "uplinkOnly": 1
        }
      },
      "system": {
        "statsOutboundUplink": true,
        "statsOutboundDownlink": true
      }
    },
    "routing": {
      "domainStrategy": "IPIfNonMatch",
      "rules": [
        {
          "inboundTag": [
            "socks-in",
            "http-in"
          ],
          "type": "field",
          "port": "53",
          "outboundTag": "dns-out",
          "enabled": true
        },
        {
          "inboundTag": [
            "socks-in",
            "http-in"
          ],
          "type": "field",
          "port": "0-65535",
          "outboundTag": "fragment-out",
          "enabled": true
        }
      ],
      "strategy": "rules"
    },
    "stats": {}
  }
