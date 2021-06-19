import { URL } from 'url'
import chalk from 'chalk'
import { validateNodeUrl } from '../command-helpers/node'
import { identifyAccessToken } from '../command-helpers/auth'
import { createJsonRpcClient } from '../command-helpers/jsonrpc'

const HELP = `
${chalk.bold('graph create')} ${chalk.dim('[options]')} ${chalk.bold('<subgraph-name>')}

${chalk.dim('Options:')}

      --access-token <token>    Graph access token
  -h, --help                    Show usage information
  -g, --node <url>              Graph node to create the subgraph in
`

module.exports = {
  description: 'Registers a subgraph name',
  run: async toolbox => {
    // Obtain tools
    const { print } = toolbox

    // Read CLI parameters
    const { g, h } = toolbox.parameters.options
    let { accessToken, help, node } = toolbox.parameters.options
    const subgraphName = toolbox.parameters.first

    // Support both long and short option variants
    node = node || g
    help = help || h

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    // Validate the subgraph name
    if (!subgraphName) {
      print.error('No subgraph name provided')
      print.info(HELP)
      process.exitCode = 1
      return
    }

    // Validate node
    if (!node) {
      print.error(`No Graph node provided`)
      print.info(HELP)
      process.exitCode = 1
      return
    }
    try {
      validateNodeUrl(node)
    } catch (e) {
      print.error(`Graph node "${node}" is invalid: ${e.message}`)
      process.exitCode = 1
      return
    }

    const requestUrl = new URL(node)
    const client = createJsonRpcClient(requestUrl)

    // Exit with an error code if the client couldn't be created
    if (!client) {
      process.exitCode = 1
      return
    }

    // Use the access token, if one is set
    accessToken = await identifyAccessToken(node, accessToken)
    if (accessToken !== undefined && accessToken !== null) {
      client.options.headers = { Authorization: `Bearer ${accessToken}` }
    }

    const spinner = print.spin(`Creating subgraph in Graph node: ${requestUrl}`)
    client.request('subgraph_create', { name: subgraphName }, function(
      requestError,
      jsonRpcError,
      _res,
    ) {
      if (jsonRpcError) {
        spinner.fail(`Error creating the subgraph: ${jsonRpcError.message}`)
        process.exitCode = 1
      } else if (requestError) {
        spinner.fail(`HTTP error creating the subgraph: ${requestError.code}`)
        process.exitCode = 1
      } else {
        spinner.stop()
        print.success(`Created subgraph: ${subgraphName}`)
      }
    })
  },
}