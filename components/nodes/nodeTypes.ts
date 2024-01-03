import React from 'react';
import UserProxy from './autogen/UserProxy';
import GroupChat from './autogen/GroupChat';
import { Edge as ReactFlowEdge, NodeProps, Node as ReactFlowNode } from 'reactflow';
import GPTAssistantAgent from './autogen/GPTAssistantAgent';
import CustomFunction from './autogen/CustomFunction';

export enum XForceNodesEnum {
  USER_PROXY = 'USER_PROXY',
  GROUP_CHAT = 'GROUP_CHAT',
  GPT_ASSISTANT_AGENT = 'GPT_ASSISTANT_AGENT',
  CUSTOM_FUNCTION = 'CUSTOM_FUNCTION',
}
export type XForceNodeDataType = {
  connectivity: {
    input: XForceNodesEnum[] | null;
    output: XForceNodesEnum[] | null;
  };
  varName?: string;
};
export type XForceNodeType = Omit<ReactFlowNode<XForceNodeDataType>, 'position'>;
export const X_FORCE_NODES: { [k in XForceNodesEnum]: XForceNodeType } = {
  GROUP_CHAT: {
    id: XForceNodesEnum.GROUP_CHAT,
    type: XForceNodesEnum.GROUP_CHAT,
    dragHandle: `.${XForceNodesEnum.GROUP_CHAT}`,
    data: {
      connectivity: {
        input: [XForceNodesEnum.USER_PROXY, XForceNodesEnum.GPT_ASSISTANT_AGENT],
        output: null,
      },
      varName: 'group_chat',
    },
  },
  USER_PROXY: {
    id: XForceNodesEnum.USER_PROXY,
    type: XForceNodesEnum.USER_PROXY,
    dragHandle: `.${XForceNodesEnum.USER_PROXY}`,
    data: {
      connectivity: {
        input: null,
        output: [XForceNodesEnum.GROUP_CHAT],
      },
      varName: 'user_proxy',
    },
  },
  GPT_ASSISTANT_AGENT: {
    id: XForceNodesEnum.GPT_ASSISTANT_AGENT,
    type: XForceNodesEnum.GPT_ASSISTANT_AGENT,
    dragHandle: `.${XForceNodesEnum.GPT_ASSISTANT_AGENT}`,
    data: {
      connectivity: {
        input: [XForceNodesEnum.CUSTOM_FUNCTION],
        output: [XForceNodesEnum.GROUP_CHAT],
      },
      varName: 'gpt_assistant',
    },
  },
  CUSTOM_FUNCTION: {
    id: XForceNodesEnum.CUSTOM_FUNCTION,
    type: XForceNodesEnum.CUSTOM_FUNCTION,
    dragHandle: `.${XForceNodesEnum.CUSTOM_FUNCTION}`,
    data: {
      connectivity: {
        input: null,
        output: [XForceNodesEnum.GPT_ASSISTANT_AGENT],
      },
    },
  },
};
export const CUSTOM_X_FORCE_NODES: { [k in XForceNodesEnum]: React.ComponentType<NodeProps> } = {
  USER_PROXY: UserProxy,
  GROUP_CHAT: GroupChat,
  GPT_ASSISTANT_AGENT: GPTAssistantAgent,
  CUSTOM_FUNCTION: CustomFunction,
};
///////
export const NODE_NAME_REGEX = /^(.*?)__[^_]+$/;
export const extractNodeName = (name: string) => {
  const match = name.match(NODE_NAME_REGEX);
  return match ? match[1] : null;
};
//////
const CODE_SKELETON = (c: string) => {
  return `import os
import autogen
from autogen.agentchat.contrib.gpt_assistant_agent import GPTAssistantAgent
from autogen import UserProxyAgent
from autogen import config_list_from_json

from dotenv import load_dotenv

load_dotenv()
config_list = config_list_from_json("OAI_CONFIG_LIST")

# ----------------- #

${c}
`;
};
export const NODE_TO_CODE_SCHEMA: { [k in XForceNodesEnum]: (params: any) => string } = {
  GROUP_CHAT: ({
    varName,
    maxRounds,
    agentSelection,
    agents,
  }: {
    varName: string;
    maxRounds: number;
    agentSelection: string;
    agents: string[];
  }) =>
    `${varName} = autogen.GroupChat(agents=[${agents}], messages=[], max_round=${maxRounds}, agent_selection="${agentSelection}")`,
  USER_PROXY: ({ varName, systemMessage }: { varName: string; systemMessage: string }) =>
    `${varName} = UserProxyAgent(name="${varName}", human_input_mode="ALWAYS", max_consecutive_auto_reply=1, system_message="${systemMessage}")`,
  GPT_ASSISTANT_AGENT: ({
    varName,
    OAIId,
    funcMap,
  }: {
    varName: string;
    OAIId: string;
    funcMap?: string;
  }) => `${varName} = GPTAssistantAgent(name="${varName}", llm_config = {"config_list": config_list, "assistant_id":"${OAIId}"})
${funcMap ? `${varName}.register_function(function_map=${funcMap})` : ''}`,
  CUSTOM_FUNCTION: ({ func }: { func: string }) => `${func || ''}`,
};
export const CODE_BUILDER = (nodes: ReactFlowNode[], edges: ReactFlowEdge[]) => {
  let codes: string[] = [];
  const m = new Map();

  // nodes
  const customFuncs = nodes.filter((node) => node.type === XForceNodesEnum.CUSTOM_FUNCTION);
  const gptAssistants = nodes.filter((node) => node.type === XForceNodesEnum.GPT_ASSISTANT_AGENT);
  const userProxies = nodes.filter((node) => node.type === XForceNodesEnum.USER_PROXY);
  const groupChats = nodes.filter((node) => node.type === XForceNodesEnum.GROUP_CHAT);

  customFuncs.forEach((el) => {
    const regex = /def\s+([a-zA-Z_]\w*)\s*\(/g;
    let match;
    const functionNames = new Set();
    while ((match = regex.exec(el.data?.func)) !== null) {
      functionNames.add(match[1]);
    }

    m.set(el.id, Array.from(functionNames));
    const key = el.type as keyof typeof XForceNodesEnum;
    const codeblock = NODE_TO_CODE_SCHEMA[key]?.(el.data || undefined);
    codes.push(codeblock);
  });
  gptAssistants.forEach((el) => {
    m.set(el.id, el?.data?.varName);
    const key = el.type as keyof typeof XForceNodesEnum;
    const connectedFuncNames = edges
      .filter(
        (e) =>
          extractNodeName(e.source || '') === XForceNodesEnum.CUSTOM_FUNCTION &&
          extractNodeName(e.target || '') === XForceNodesEnum.GPT_ASSISTANT_AGENT,
      )
      .map((e) => {
        const funcNames = m.get(e.source);
        return funcNames.map((f: string) => `"${f}": ${f}`);
      });
    const functionMap = `{${connectedFuncNames}}`;
    const codeblock = NODE_TO_CODE_SCHEMA[key]?.({ ...el.data, funcMap: functionMap } || undefined);
    codes.push(codeblock);
  });
  userProxies.forEach((el) => {
    m.set(el.id, el?.data?.varName);
    const key = el.type as keyof typeof XForceNodesEnum;
    const codeblock = NODE_TO_CODE_SCHEMA[key]?.(el.data || undefined);
    codes.push(codeblock);
  });
  // group chat
  groupChats.forEach((el) => {
    m.set(el.id, el?.data?.varName);

    const agents = edges
      .filter((e) => extractNodeName(e.target || '') === XForceNodesEnum.GROUP_CHAT)
      .map((e) => m.get(e.source));
    const key = el.type as keyof typeof XForceNodesEnum;
    const codeblock = NODE_TO_CODE_SCHEMA[key]?.({ ...el.data, agents } || undefined);
    codes.push(codeblock);
  });

  // build code
  return CODE_SKELETON(codes.join('\n'));
};
