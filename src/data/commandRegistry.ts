
export interface CommandSchema {
  type: string;
  domain: string;
  description: string;
  schema: {
    type: string;
    title: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const commandRegistry: CommandSchema[] = [
  {
    "type": "logMessage",
    "domain": "system",
    "description": "System command: logMessage",
    "schema": {
      "type": "object",
      "title": "logMessage",
      "properties": {
        "message": {
          "type": "string"
        },
        "systemId": {
          "type": "string"
        }
      },
      "required": [
        "message"
      ]
    }
  },
  {
    "type": "simulateFailure",
    "domain": "system",
    "description": "System command: simulateFailure",
    "schema": {
      "type": "object",
      "title": "simulateFailure",
      "properties": {
        "systemId": {
          "type": "string"
        }
      }
    }
  },
  {
    "type": "emitMultipleEvents",
    "domain": "system",
    "description": "System command: emitMultipleEvents",
    "schema": {
      "type": "object",
      "title": "emitMultipleEvents",
      "properties": {
        "count": {
          "type": "number"
        },
        "systemId": {
          "type": "string"
        }
      },
      "required": [
        "count"
      ]
    }
  },
  {
    "type": "executeTest",
    "domain": "system",
    "description": "System command: executeTest",
    "schema": {
      "type": "object",
      "title": "executeTest",
      "properties": {
        "testId": {
          "type": "string"
        },
        "testName": {
          "type": "string"
        },
        "systemId": {
          "type": "string"
        },
        "parameters": {
          "type": "object",
          "additionalProperties": {
            "type": "any"
          }
        }
      },
      "required": [
        "testId",
        "testName"
      ]
    }
  },
  {
    "type": "executeRetryableTest",
    "domain": "system",
    "description": "System command: executeRetryableTest",
    "schema": {
      "type": "object",
      "title": "executeRetryableTest",
      "properties": {
        "testId": {
          "type": "string"
        },
        "testName": {
          "type": "string"
        },
        "systemId": {
          "type": "string"
        },
        "parameters": {
          "type": "object",
          "additionalProperties": {
            "type": "any"
          }
        }
      },
      "required": [
        "testId",
        "testName"
      ]
    }
  }
];
