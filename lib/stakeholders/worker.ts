/*
    Worker file for spawning sub-agents
*/

import { StakeholderAgent } from "./agent";
import { models } from "../models";

// Define our agent
let agent: StakeholderAgent | null = null;

// Call on message
self.onmessage = async (event) => {
    const { data, type } = event.data;

    if (type == 'INIT') {
        agent = new StakeholderAgent(models[0], data.name, data.description, data.influenceWeight);
        agent.run();
    } else if (type == 'RANK_STRATEGIES') {
        const rankings = await agent?.rankStrategies(data.strategies);
        self.postMessage({ data: rankings, type: 'RANK_STRATEGIES_RESULT' });
    } 
}