import { Construct } from "constructs";
import { Cognito } from './src/cognito';
import { Frontend } from './src/app';
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";


export class Authorization extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", {
      region: "us-east-1",
      accessKey: assertAwsAccessKey(process.env.AWS_ACCESS_KEY_ID),
      secretKey: assertAwsSecretAccessKey(process.env.AWS_SECRET_ACCESS_KEY),
    });

    const frontend = new Frontend(this, 'frontend', {
      service: "auth",
    });

    new Cognito(this, 'cognito', {
      userPoolName: "noterickg-dev",
      callbackUrls: ["https://" + frontend. CFDistribution.domainName ],
    });
  }
}

const app = new App();
const stack = new Authorization(app, 'authorization-stack');

new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "new-raleigh",
  workspaces: new NamedCloudWorkspace("auth-backend"),
  token: process.env.TFE_TOKEN,
});


app.synth();


// function to see if the process.env.AWS_ACCESS_KEY_ID is undefined or empty
// throw an error if it is
export function assertAwsAccessKey(awsAccessKeyId: string | undefined): string {
  if (awsAccessKeyId === undefined || awsAccessKeyId === "") {
    throw new Error("AWS_ACCESS_KEY_ID is undefined or empty. Please set the AWS_ACCESS_KEY_ID environment variable to your AWS Access Key ID.");
  }
  return awsAccessKeyId;
}

// function to see if the process.env.AWS_SECRET_ACCESS_KEY is undefined or empty
// throw an error if it is
export function assertAwsSecretAccessKey(awsSecretAccessKey: string | undefined): string {
  if (awsSecretAccessKey === undefined || awsSecretAccessKey === "") {
    throw new Error("AWS_SECRET_ACCESS_KEY is undefined or empty. Please set the AWS_SECRET_ACCESS_KEY environment variable to your AWS Secret Access Key.");
  }
  return awsSecretAccessKey;
}
