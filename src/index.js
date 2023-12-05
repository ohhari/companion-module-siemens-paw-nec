import { InstanceBase, InstanceStatus, Regex, runEntrypoint } from '@companion-module/base'
import getActions from './actions.js'
import getVariables from './variables.js'
import { Socket } from 'net'

//Based on https://github.com/NECDisplaySolutions/necpdsdk/blob/master/nec_pd_sdk/

const LUT_HEX_4b = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
const LUT_HEX_8b = new Array(0x100);
for (let n = 0; n < 0x100; n++) {
  LUT_HEX_8b[n] = `${LUT_HEX_4b[(n >>> 4) & 0xF]}${LUT_HEX_4b[n & 0xF]}`;
}

class PAWNECInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	//Initiates the module
	async init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)
		this.log('info', 'Initiate startup...')

		this.updateActions()
		this.updateVariables()
		this.updateStatus(InstanceStatus.Ok)
		this.log('info', 'Startup finished')
	}

	//Destroys object
	async destroy() {
		this.log('debug', 'destroy')
	}

	//Updates the available actions
	updateActions() {
		this.log('debug', 'Updating actions...')
		this.setActionDefinitions(getActions(this))
	}

	//Updates the available variables
	updateVariables() {
		this.log('debug', 'Updating variables...')
		this.setVariableDefinitions(getVariables(this))
	}

	//Sets the config fields
	async configUpdated(config) {
		this.config = config
	}

	//Configuration of the config fields
	getConfigFields() {
		this.log('debug', 'Getting config fields...')
		return [
		]
	}
	
	//Decode Byte to hex
	toHex(buffer) {
		let out = '';
			for (let idx = 0, edx = buffer.length; idx < edx; idx++) {
				out += '0x'
				out += LUT_HEX_8b[buffer[idx]];
				out += ', '
			}
		return out;
	}

	//2 byte Codierung NEC
	ascii_encode_value_2_bytes(value) {
		let output_data = []
		if(!((0 <= value) && (value <= 0xff))){
			throw new Error('Invalid value')
		} 
		let val = value >> 4
		if (val > 9){
			val += 65 - 10
		} else {
			val += 48
		}
		output_data.push(val)
		val = (value & 0x0f) % 16
		if (val > 9) {
			val += 65 - 10
		} else {
			val += 48
		}
		output_data.push(val)
    	return output_data
	}

	//Decodierung NEC
	ascii_decode_value(data) {
		let value = 0
		for (let byte of data) {
			value *= 16
			if ((48 <= byte) && (byte <= 57)) {
				value += byte - 48
			} else if ((65 <= byte) && (byte <= 72)) {
					value += byte - 65 + 10
			} else if ((97 <= byte) && (byte <= 104)) {
					value += byte - 97 + 10
			} else {
				this.log('error','invalid hex character: ' + value)
				value = 0
			}
		}
		return value
	}

	//Check messsage for NEC
	getCommand(data, destination_address, message_type){
		let output_data = []
		//SOH		
		output_data.push(0x01)
		//Reserved
		output_data.push(0x30)
		//Destination
		output_data.push(destination_address)
		this.log('debug', 'Destination address: ' + destination_address)
		//Source
		output_data.push(0x30)
		this.log('debug', 'Source address: ' + 0x30)
		//Message type
		output_data.push(message_type)
		this.log('debug', 'Message type: ' + message_type)
		//Message length
		output_data.push(...this.ascii_encode_value_2_bytes(data.length+ 2))
		this.log('debug', 'Message length: ' + (data.length + 2))
		//STX
		output_data.push(0x02)
		//Data
		output_data.push(...data)
		//ETX
		output_data.push(0x03)
		//Checksum
		let checksum = 0
		for (let i = 1; i < output_data.length; i++){
			checksum ^= output_data[i]
		}
		output_data.push(checksum)
		this.log('debug','Checksum: ' + checksum)
		//Delimiter
		output_data.push(0x0D)
		let out = new Uint8Array(output_data)
		this.log('debug','Bytes Request: ' + this.toHex(out))
		return out
	}

	//Check answer from NEC
	readReply(reply) {
		var buffer = [...new Buffer.from(reply, 'utf-8')]
		this.log('debug', 'Bytes Answer: ' + this.toHex(buffer))
		//SOH
		if (buffer[0] != 0x01) {
			throw new Error('Wrong SOH')
		}
		//Reserved		
		if (buffer[1] != 0x30) {
			throw new Error('Wrong reserved')
		}
		//Destination
		let destination_address
		if (buffer[3] != 0x41) {
			throw new Error('Wrong destination address')
		} else {
			destination_address = buffer[3]
			this.log('debug', 'Destination address: ' + destination_address)	
		}
		//Source
		this.log('debug', 'Source address: ' + buffer[2])
		//Message type
		let message_type = buffer[4]
		this.log('debug', 'Message type: ' + message_type)
		//Message length
		let length = this.ascii_decode_value([buffer[5], buffer[6]]) - 2
		this.log('debug', 'Message length: ' + length)
		//Data
		let data = []
		if (length > 0) {	
			//STX
			if (buffer[7] != 0x02){
				throw new Error('Wrong STX')
			}	
			for(let l= 8;l <= (7 + length); l++){
				data.push(buffer[l])	
			}
		}
		//ETX		
		let l = 8 + length
		if (buffer[l] != 0x03){
			throw new Error('Wrong ETX')
		}
		//Checksum
		let checksum = 0
		for (let i = 1; i < buffer.length-2; i++){
			checksum ^= buffer[i]
		}
		if (buffer[l+1] != checksum){
			throw new Error('Wrong Checksum')
		} else {
			this.log('debug','Checksum OK')
		}
		//Delimiter
		if (buffer[l+2] != 0x0D){
			throw new Error('Wrong Delimiter')
		}

		return [data, length, message_type]
	}

	//Send data to Server
	async connectToMonitor(command, ip_adress) {
		return new Promise((resolve, reject) => {
			let answer = ''
			let client = new Socket()		
			client.connect(7142, ip_adress, async () => {
				this.log('debug', 'Connect to Server...')
				client.write(command)
			})

			client.on('data', async (data) => {
				data = decodeURIComponent(data.toString())
				//this.log('debug', 'Received: ' + data.length + ' bytes\n' + data)
				answer = answer + data
			})

			client.on('close', async () => {
				client.destroy()
				this.log('debug', 'Connection to Server closed...')
			})

			client.on('error', async () => {
				client.destroy()
				reject('Connection error')
				this.log('debug', 'Connection to Server closed...')
			})

			setTimeout(() => {
				client.end()
				if (answer != '') {
					resolve(answer)
				} else {
					reject('No answer from server')						
				}
			}, 200)
		})
	}

	//Get the power state of a device
	async getPowerState(destination_ip){
		return new Promise ((resolve, reject) => {
			let send_data = []
			send_data.push(...this.ascii_encode_value_2_bytes(0x01)) //0x01D6
			send_data.push(...this.ascii_encode_value_2_bytes(0xD6)) 
			this.connectToMonitor(this.getCommand(send_data, 0x41, 0x41), destination_ip)
				.then((ans) => {
					try {
						let reply = this.readReply(ans)
						let reply_data = reply[0]
						let reply_data_length = reply[1]
						let reply_message_type = reply[2]
						if (reply_data_length == 16) {
							if (reply_message_type != 0x42) {
								reject('Unexpected message type received')
							} else if (([reply_data[0], reply_data[1]].toString() != this.ascii_encode_value_2_bytes(0x02).toString())&&([reply_data[2], reply_data[3]].toString() != this.ascii_encode_value_2_bytes(0x00).toString())) {
								reject('Unexpected error 1 received')
							} else if (([reply_data[4], reply_data[5]].toString() != this.ascii_encode_value_2_bytes(0xD6).toString())&&([reply_data[6], reply_data[7]].toString() != this.ascii_encode_value_2_bytes(0x00).toString())) {
								reject('Unexpected error 2 received')
							} else {
								resolve(this.ascii_decode_value([reply_data[12], reply_data[13], reply_data[14], reply_data[15]]))
							}
						} else {
							reject('Unexpected reply length: ' + reply_data.length + ' (expected 16)')
						}
					} catch (err) {
						reject('Unexpected reply: ' + err)
					}
				})
				.catch((err) => {
					reject(err)
				})
		})
	}

	//Set the power state of a device
    async setPowerState(state, destination_ip){
		return new Promise ((resolve, reject) => {
			let send_data = []
			send_data.push(...this.ascii_encode_value_2_bytes(0xC2))
			send_data.push(...this.ascii_encode_value_2_bytes(0x03)) //0x03D6
			send_data.push(...this.ascii_encode_value_2_bytes(0xD6))
			send_data.push(...this.ascii_encode_value_2_bytes(0x00))
			send_data.push(...this.ascii_encode_value_2_bytes(state))	
			this.connectToMonitor(this.getCommand(send_data, 0x41, 0x41), destination_ip)
				.then((ans) => {
					let reply = this.readReply(ans)
					let reply_data = reply[0]
					let reply_data_length = reply[1]
					let reply_message_type = reply[2]
					this.log('debug', 'Connection to Server closed...' + reply_message_type)
					if (reply_data_length == 12) {
						if (reply_message_type != 0x42) {
							reject('Unexpected message type received')
						} else if (([reply_data[0], reply_data[1]].toString() != this.ascii_encode_value_2_bytes(0x00).toString())&&([reply_data[2], reply_data[3]].toString() != this.ascii_encode_value_2_bytes(0xC2).toString())) {
							reject('Unexpected error 1 received')
						} else if (([reply_data[4], reply_data[5]].toString() != this.ascii_encode_value_2_bytes(0x03).toString())&&([reply_data[6], reply_data[7]].toString() != this.ascii_encode_value_2_bytes(0xD6).toString())) {
							reject('Unexpected error 2 received')
						} else {
							resolve(this.ascii_decode_value([reply_data[8], reply_data[9], reply_data[10], reply_data[11]]))
						}
					} else {
						reject('Unexpected reply length: ' + reply_data.length + ' (expected 12)');
					}
				})
				.catch((err) => {
					reject(err)
				})
		})
    } 

	//Send a IR remote control code
	async sendIRCode(code, destination_ip){
		return new Promise ((resolve, reject) => {
			let send_data = []
			send_data.push(...this.ascii_encode_value_2_bytes(0xC2)) //0xC210
			send_data.push(...this.ascii_encode_value_2_bytes(0x10))
			send_data.push(...this.ascii_encode_value_2_bytes(0x00))
			send_data.push(...this.ascii_encode_value_2_bytes(code))
			send_data.push(...this.ascii_encode_value_2_bytes(0x03))
			this.connectToMonitor(this.getCommand(send_data, 0x41, 0x41), destination_ip)
				.then((ans) => {
					let reply = this.readReply(ans)
					let reply_data = reply[0]
					let reply_data_length = reply[1]
					if (reply_data_length == 8) {
						if (([reply_data[0], reply_data[1]].toString() != this.ascii_encode_value_2_bytes(0xC3).toString())&&([reply_data[2], reply_data[3]].toString() != this.ascii_encode_value_2_bytes(0x10).toString())) {
							reject('Unexpected error 1 received')
						} else if (([reply_data[4], reply_data[5]].toString() != this.ascii_encode_value_2_bytes(0x00).toString())&&([reply_data[6], reply_data[7]].toString() != this.ascii_encode_value_2_bytes(code).toString())) {
							reject('Unexpected error 2 received')
						} else {
							resolve()
						}
					} else if (reply_data_length == 12){
						if (([reply_data[2], reply_data[3]].toString() != this.ascii_encode_value_2_bytes(0xC2).toString())&&([reply_data[4], reply_data[5]].toString() != this.ascii_encode_value_2_bytes(0x10).toString())) {
							reject('Unexpected error 1 received')
						} else if (([reply_data[6], reply_data[7]].toString() != this.ascii_encode_value_2_bytes(0x00).toString())&&([reply_data[8], reply_data[9]].toString() != this.ascii_encode_value_2_bytes(code).toString())) {
							reject('Unexpected error 2 received')
						} else {
							resolve()
						}
					} else {
						reject('Unexpected reply length: ' + reply_data.length + ' (expected 8)');
					}
				})
				.catch((err) => {
					reject(err)
				})
		})
	}
}

runEntrypoint(PAWNECInstance, [])
