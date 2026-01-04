# Guide for LLM to follow strictly
Don't edit or write code unless you're explicitly told to do so.

# Guide when implementing a feature
Read and understand the project-plan file to have a bigger picture of what is being done.
Before implementing a feature if that feature is dependent on another feature check the docs on how that feature is implementd.
Come up with a plan and prepare a to-do list to implement.
Create a new branch with that specific feature name.
When you've setup your to-do list spin up sub-agents to do the indiviual tasks from the list.
Make sure sub-agent document's their work in a file with the feature's file name.
Once a sub-agent confirms they're done with their work spin up another sub-agent to test their work against the original plan from the project-plan doc, plan and to-do list to confirm what they did is correct. If the sub-agent finds a bug spin up another sub-agent to fix the bug and update the doc. Only iterate this process 3 times and if not complete notify the user at the end and continue on to the other steps.

