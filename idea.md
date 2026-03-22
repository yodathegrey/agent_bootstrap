

GOAL: Develop plan.md file in markdown format. Develop agent bootstrap which allows agents to create remote agents on the fly. This can allow for remote dropping with similar functionality as a reverse shell or netcat tunnel. Server component previously configured will act as the proxy hub for all agent communications. This will allow modular integration into any LLM (Claude API, OpenAI API, Azure Foundry, GCP Vertex AI, and others not mentioned)

CONTEXT:
{
    Requirements in no particular order: ["Secure encryption negotiated with all communications",
    "Communication flows through the server component configured in settings",
    "Downstream agents should leverage communication path from the previous write drop.",
    "This write capability should should able to be called from server or downstream agents",
    "Communicating with any external entity needs to happen through encrypted tunnel with server/upstream agents
    "Communicate over modern performant protocols",
    "Keep a lightweight set of memory as the kernel memory, along with any other necessary secondary memory - lightweight important",
    "Should be able to be used on any platform, including linux, windows, and mac",
    "Microsoft Agent Framework for agents",
    "Adapt to the Claude skills framework to integrate directly with skill hubs",
    "Create skill capability to install skills and use them immediately.",
    "start with a basic set of core skills to be able to work on windows, linux, and mac - ensure bootstap has the understand in architecture running to configure at drop time",
    "optional frontend GUI (CLI should mirror GUI functions) - React based modern console UI will provide:
    RBAC for authentication
    Login page
    Splash page
    Settings page


    ]
}