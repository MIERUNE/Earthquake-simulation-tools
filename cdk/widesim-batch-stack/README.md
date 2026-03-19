# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


npx @aws-amplify/cli codegen add

 ? Choose the type of app that you're building - javascript
 ? What javascript framework are you using - none
 ? Choose the code generation language target - typescript
 ? Enter the file name pattern of graphql queries, mutations and subscriptions - types/*.ts
 ? Do you want to generate/update all possible GraphQL operations - queries, mutations and subscriptions - Yes
 ? Enter maximum statement depth [increase from default if your schema is deeply nested] - 2
 ? Enter the file name for the generated code - types/graphql.ts
 ? Do you want to generate code for your newly created GraphQL API - Yes

 # amplify codegen add with default options (non-interactive)

# Configuration settings
AMPLIFY_CONFIG='{
  "codegen": {
    "generateCode": true,
    "codeLanguage": "typescript",
    "generatedFileName": "types/*.ts",
    "maxDepth": 2,
    "target": "javascript",
    "includes": ["src/graphql/**/*.ts"],
    "excludes": ["src/graphql/**/*.d.ts"]
  }
}'

# Write configuration to amplify-codegen-config.json
echo "$AMPLIFY_CONFIG" > amplify-codegen-config.json

# Run amplify codegen add silently
amplify codegen add