import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { App, TerraformStack } from "cdktf";

import { Construct } from "constructs";
import { Posts } from "./posts";
import { Frontend } from "./frontend";
type Stage = "development" | "production";

interface StageOptions {
  stage: Stage;
  user?: string;
}

const app = new App();


class PostsStack extends TerraformStack {
  public posts: Posts;
  public frontEnd: Frontend;

  constructor(scope: Construct, name: string, public options: StageOptions) {
    super(scope, name);
    new AwsProvider(this, "aws", {
      region: "us-east-1",
      accessKey: assertAwsAccessKey(process.env.AWS_ACCESS_KEY_ID),
      secretKey: assertAwsSecretAccessKey(process.env.AWS_SECRET_ACCESS_KEY),
      token: assertAwsSessionToken(process.env.AWS_SESSION_TOKEN),
    });


    this.posts = new Posts(this, "posts", {
      stage: options.stage,
    });
    this.frontEnd = new Frontend(this, "front-end", {
      stage: options.stage,
      apiEndpoint: this.posts.apiEndpoint,
    });

  }
}

const postsStack = new PostsStack(app, "posts-stack", {
  stage: assertStage(process.env.STAGE),
});

// write an export getPostsStack() function to return the postsStack
export function getPostsStack(): PostsStack {
  return postsStack;
}



// new CloudBackend(postsStack, {
//   hostname: "app.terraform.io",
//   organization: "new-raleigh",
//   workspaces: new NamedCloudWorkspace("posts-backend"),
//   token: process.env.TFE_TOKEN,
// });


app.synth();


// try to see if the process.env.STAGE can be casted to type Stage
// throw an error if it cannot
function assertStage(stage: string | undefined): Stage {
  if (stage === undefined) {
    return "production";
  }
  if (stage === "development" || stage === "production") {
    return stage;
  }
  throw new Error(`Invalid stage: ${stage}`);
}

// function to see if the process.env.AWS_ACCESS_KEY_ID is undefined or empty
// throw an error if it is
function assertAwsAccessKey(awsAccessKeyId: string | undefined): string {
  if (awsAccessKeyId === undefined || awsAccessKeyId === "") {
    throw new Error("AWS_ACCESS_KEY_ID is undefined or empty. Please set the AWS_ACCESS_KEY_ID environment variable to your AWS Access Key ID.");
  }
  return awsAccessKeyId;
}

// function to see if the process.env.AWS_SECRET_ACCESS_KEY is undefined or empty
// throw an error if it is
function assertAwsSecretAccessKey(awsSecretAccessKey: string | undefined): string {
  if (awsSecretAccessKey === undefined || awsSecretAccessKey === "") {
    throw new Error("AWS_SECRET_ACCESS_KEY is undefined or empty. Please set the AWS_SECRET_ACCESS_KEY environment variable to your AWS Secret Access Key.");
  }
  return awsSecretAccessKey;
}

function assertAwsSessionToken(awsSessionToken: string | undefined): string | undefined {
  if (awsSessionToken === undefined || awsSessionToken === "") {
    throw new Error("AWS_SESSION_TOKEN is undefined or empty. Please set the AWS_SESSION_TOKEN environment variable to your AWS Session Token.");
  }
  return awsSessionToken;
}