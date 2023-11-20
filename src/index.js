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
}

runEntrypoint(PAWNECInstance, [])
