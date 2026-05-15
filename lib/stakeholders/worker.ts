import { StakeholderAgent } from "./agent";
import { models } from "../models";

self.onmessage = (event) => {
    const { name, description, type } = event.data;
    console.log(name, description, type);

    if (type == 'INIT') {
        console.log("Initializing stakeholder agent with name:", name, "and description:", description);
        const agent = new StakeholderAgent(models[0], name, description);
        agent.run();
    }
}