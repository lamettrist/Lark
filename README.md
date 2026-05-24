# Lark
*A better, more refined version of the Lark Engine*


> "Lark is a biologically inspired decision-making framework that couples LLM-driven reasoning with an evolutionary, stakeholder-aware Multi-Agent System (MAS). To address verbosity and stakeholder trade-offs, we integrate four mechanisms: (i) plasticity, which applies concise adjustments to candidate solutions; (ii) duplication and maturation, which copy high-performing candidates and specialize them into new modules; (iii) ranked-choice stakeholder aggregation using influence-weighted Borda scoring; and (iv) compute awareness via token-based penalties that reward brevity. The system iteratively proposes diverse strategies, applies plasticity tweaks, simulates stakeholder evaluations, aggregates preferences, selects top candidates, and performs duplication/maturation while factoring compute cost into final scores."

(from the abstract of the arxiv paper of the same name)

## Components
While Lark is a major model, it is broken down into specific custom-made components tailored to the framework:
* Master Agent: our orchestrator, handles everything, including: spawning stakeholders, chatting with them, performing research, starting evolutionary generation, and more.
* Stakeholders: core of the framework, triggered to interact via our custom Communication Server implementation (with sockets) and rank with the evolutionary generation
* Communication Server: Handles communication between each of the clients (master agent, stakeholder, evolutionary processes) via sockets
* Evolutionary Processes: Backbone of the platform, handles everything related to the biological functions (much like AlphaEvolve), makes those adjustments, and also reports them back to the Master Agent and Stakeholders through the server.

And to top it all off, all tasks for the benchmark are autodiscovered and executed by the benchmark script to ensure the code can be reproducible with new modules.

## Setup
Setting up Lark is relatively simple. All you need is [bun](https://bun.sh) and a [Hack Club API Key](https://ai.hackclub.com), put the latter in the .env (see .env.example), and run ```bun setup```. We'll take care of the rest.

## Examples of Usage
To use Lark, all you need is to import the Master Agent (and pass the model) from the ``lib/agents.ts`` file, create a new class, and run agent.run, as the following:

```javascript
import { MasterAgent } from './lib/agents.ts';
const agent = new MasterAgent(models[0]);
console.log(await agent.run("Say hi!"));
```

Otherwise, try playing around with the inference script by running ```bun benchmark```!

## Benchmarking
Benchmarking the platform is a necessity to understand its performance compared to other types of platforms, so we've created tooling for new functions to be implemented that assess the frameworks performance in decision-making related and real-world scenarios, which you can help to contribute to! To create a task that'll be autodicovered when running ```bun benchmark```, create a file in the ``benchmarking/tasks`` folder, and then use the following structure for it to work:

```javascript
// imports
import { MasterAgent } from "../../lib/agents";

// executed function 
export default async function Function() {
  // put content here, e.g.
  const taskResponse = await (new MasterAgent(models[0])).run() // make sure to import the model from lib/models.ts, or provide your own.
  return RESULT // return content here of any type (can be array, string, or object, will be written to results/[file-name] once bun benchmark is executed).
}
```

### Current Tasks
The current implemented tasks are
* LLM-as-a-judge ranking of models.

More to come in the feature.

## Bug Requests
Facing bugs or issues? Create an issue!
