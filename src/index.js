import { InstanceBase, InstanceStatus, Regex, runEntrypoint } from '@companion-module/base'
import getActions from './actions.js'
import getVariables from './variables.js'
import { Socket } from 'net'

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

	ascii_encode_value_2_bytes(value) {
		let output_data = []
		if(!(0 <= value <= 0xff)){
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

	ascii_encode_value_4_bytes(value){
		if (!(0 <= value <= 0xffff)){
			throw new Error('Invalid value')
		} 
		let data = this.ascii_encode_value_2_bytes(value >> 8)
		data.push(this.ascii_encode_value_2_bytes(value & 0x00ff))
		return data
	}

	ascii_decode_value(data) {
		let value = 0
		for (let byte in data) { 
			value *= 16
			if (48 <= byte <= 57) {
				value += byte - 48
			} else if (65 <= byte <= 72) {
					value += byte - 65 + 10
			} else if (97 <= byte <= 104) {
					value += byte - 97 + 10
			} else {
				this.log('error','Invalid hex character: ' + byte)
				value = 0
			}
		}
		return value
	}

	getCommand(data, destination_address, message_type){
		let output_data = []
		let checksum = 0
		let length = this.ascii_encode_value_2_bytes(data.length + 2)
		output_data.push(0x01) //SOH
		output_data.push(0x30) //fixed
		output_data.push(destination_address) //destination address
		this.log('debug', 'Destination address: ' + destination_address)
		output_data.push(0x30) //source address
		this.log('debug', 'Source address: ' + 0x30)
		output_data.push(message_type) //message type
		this.log('debug', 'Message type: ' + message_type)
		output_data.push(...length) //message length
		this.log('debug', 'Message length: ' + length)
		output_data.push(0x02) //STX
		output_data.push(...data) //data
		output_data.push(0x03) //ETX
		for (let i = 1; i < output_data.length; i++){
			checksum ^= output_data[i]
		}
		output_data.push(checksum) //checksum
		output_data.push(0x0D) //delimiter
		this.log('debug','Output data:')
		for (let item of output_data){
			this.log('debug', item)
		}
		return new Uint8Array(output_data)
	}

	readReply(reply) {
		var data = []
		var mybuffer = []
		var buffer = new Buffer.from(reply, 'utf-8')
		this.log('debug', 'Items: ')
		for (var i = 0; i < buffer.length; i++){
			mybuffer.push(buffer[i])
			this.log('debug', buffer[i])
		}
		if (buffer[0] != 0x01) {
			throw new Error('Wrong SOH')
		} 
		if (buffer[1] != 0x30) {
			throw new Error('Wrong reserved')
		} 
		if (buffer[3] != 0x41) {
			throw new Error('Wrong destination address')
		} 
		this.log('debug', 'Destination address: ' + buffer[2])
		this.log('debug', 'Source address: ' + buffer[3])
		this.log('debug', 'Message type: ' + buffer[4])
		var length = parseInt((buffer[5] << 4) + buffer[6], 16)
		this.log('debug', 'Message length: ' + length)
		if (length > 0) {	
			if (buffer[7] != 0x02){
				throw new Error('Wrong STX')
			}
			//data = (buffer[8] << 4) + buffer[9]
			data = [buffer[8], buffer[9]]
			this.log('debug', 'Data: ' + data)
			if (buffer[10] != 0x03){
				throw new Error('Wrong ETX')
			}
			if (buffer[11] != 0x01){
				throw new Error('Wrong Checksum' + buffer[11])
			}
			if (buffer[12] != 0x0D){
				throw new Error('Wrong Delimiter')
			}
		} else {
			if (buffer[6] != 0x03){
				throw new Error('Wrong ETX')
			}
			if (buffer[7] != 10){
				throw new Error('Wrong Checksum')
			}
			if (buffer[8] != 0x0D){
				throw new Error('Wrong Delimiter')
			}
		}
		let answer = []
		answer.push(data)
		answer.push(length)
		answer.push(buffer[4])
		answer.push(buffer[3])
		return answer
	}


	async connectToMonitor(command, ip_adress) {
		return new Promise((resolve, reject) => {
			let client = new Socket()
			let answer = ''		
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
				if (answer != '') {
					resolve(answer)
				} else {
					reject('No answer from server')						
				}
			}, 1000)
		})
	}

	async getPowerState(destination_ip){
        let send_data = []
		send_data.push(...this.ascii_encode_value_4_bytes(0x01D6))
		this.connectToMonitor(this.getCommand(send_data, 0x41, 0x41), destination_ip)
			.then((ans) => {
				try {
					let reply = this.readReply(ans)
					let reply_data = reply[0]
					let reply_data_length = reply[1]
					let reply_message_type = reply[2]
					let reply_destination_address = reply[3]
					if (reply_data_length >= 16) {	//==
						if ((reply_message_type != 0x42)||(reply_data[1] != 0xC2)||(reply_data[0] != 0xD6)) {
						//if ((reply_message_type != 0x42)||(reply_data.slice(0, 4) != this.ascii_encode_value_4_bytes((0x00C2)))||(reply_data.slice(4, 8) != this.ascii_encode_value_4_bytes((0xD600)))) {
							throw new Error('Unexpected reply received' + reply_data[1] + ' ' + 0xC2 + ' ' + reply_data[0] +' ' + 0xD6 + ' ')
						} else {
							return this.ascii_decode_value(reply_data.slice(12, 12 + 4))
						}
					} else {
						throw new Error('Unexpected reply length: ' + reply_data.length + ' (expected 16)')
					}
				} catch (err) {
					throw new Error('Unexpected reply: ' + err)
				}

			})
			.catch((err) => {
				throw new Error(err)
			})
	}

    async setPowerState(state, destination_ip){
        let send_data = []
        send_data.push(...this.ascii_encode_value_2_bytes(0xC2))
		send_data.push(...this.ascii_encode_value_2_bytes(0x03D6))
		send_data.push(...this.ascii_encode_value_2_bytes(state))
		this.connectToMonitor(this.getCommand(send_data, 0x41, 0x41), destination_ip)
			.then((reply) => {
				this.log('debug', reply)
				let reply_data = reply[0]
				let reply_message_type = reply[1]
				let reply_destination_address = reply[2]
				if (reply_data.length == 12) {
					if ((reply_message_type != 0x42)||(reply_data[1] != 0xC2)||(reply_data[0] != 0xD6)) {//=> war anders
					//if ((reply_message_type != 0x42)||(reply_data.slice(0, 4) != this.ascii_encode_value_4_bytes((0x00C2)))||(reply_data.slice(4, 8) != this.ascii_encode_value_4_bytes((0xD600)))) {
						throw new Error('Unexpected reply received' + reply_data[1] +' ' +0xC2)
					} else {
						return this.ascii_decode_value(reply_data.slice(8, 8 + 4))
					}
				} else {
					throw new Error('Unexpected reply length: ' + reply_data.length + ' (expected 12)');
				}
			})
			.catch((err) => {
				throw new Error(err)
			})
    } 
}

runEntrypoint(PAWNECInstance, [])
