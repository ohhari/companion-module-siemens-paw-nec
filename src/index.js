import { InstanceBase, InstanceStatus, Regex, runEntrypoint } from '@companion-module/base'
import getActions from './actions.js'
import getVariables from './variables.js'

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

	//Get state from device
	getState(g_host, g_oid) {
		var session = new Session({ host: g_host, community: 'public' });
		session.getNext({ oid: g_oid }, (error, answer) => {
			if (error) {
				this.log('error', JSON.stringify(error));
			} else {
				let data = 0
				if (answer[0].value == 1) {
					data = 'On'
				} else {
					data = 'Off'
				}
				this.log('info', 'State of Device '  + g_host + ' is ' + data);
				this.log('debug', 'SNMP-Answer:' + JSON.stringify(answer));
			}
		});
		setTimeout(() => {
			session.close()
		}, 500);
	}

	//Set state of device
	setState(s_host, s_oid, s_value) {
		var session = new Session({ host: s_host, community: 'private' });
		session.set({ oid: s_oid , value: s_value, type: 71 }, (error, data) => {
			if (error) {
				this.log('error', JSON.stringify(error));
			} else {
				let data = 0
				if (answer[0].value == 1) {
					data = 'On'
				} else {
					data = 'Off'
				}
				this.log('info', 'State of Device '  + s_host + ' set to ' + data);
				this.log('debug', 'SNMP-Answer:' + JSON.stringify(answer));
			}
		});
		setTimeout(() => {
			session.close()
		}, 1000);
	}
}

runEntrypoint(PAWNECInstance, [])
