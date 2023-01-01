import { Construct } from 'constructs';
import { TerraformOutput } from 'cdktf';
//import CognitoUserPool
import { CognitoUserPool } from "@cdktf/provider-aws/lib/cognito-user-pool";
// import IamRole
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
// import iamPolicy 
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
// import IamRolePolicyAttachment
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
// import CognitoUserPoolClient
import { CognitoUserPoolClient } from "@cdktf/provider-aws/lib/cognito-user-pool-client";



export interface Props {
    userPoolName: string;
    callbackUrls: string[];
}

export class Cognito extends Construct {
    public readonly userPoolArn: string;
    public readonly userPoolClientSecret: string;
    public readonly userPoolClientId: string;
    public readonly userPoolClientOauthScopes: string[];

    constructor(scope: Construct, name: string, props: Props ) {
        super(scope, name);

        const snsPolicy = new IamPolicy(this, 'sns-policy', {
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: ['sns:publish'],
                    Resource: "*"
                }]
            })
        });

        const snsRole = new IamRole(this, 'sns-role', {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "cognito-idp.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        })

        new IamRolePolicyAttachment(this, 'sns-iam-attachment', {
            role: snsRole.name as string,
            policyArn: snsPolicy.arn
        });

        const userPool = new CognitoUserPool(this, 'cognito-user-pool', {
            name: props.userPoolName,
            autoVerifiedAttributes: ['email'],
            mfaConfiguration: 'OPTIONAL',
            smsConfiguration: {
                externalId: props.userPoolName + '-external',
                snsCallerArn: snsRole.arn
            },
            passwordPolicy: {
                minimumLength: 8,
                requireLowercase: true,
                requireNumbers: true,
                requireSymbols: true,
                requireUppercase: true,
                temporaryPasswordValidityDays: 7
            },
            schema: [{
                "name": "email",
                "attributeDataType": "String",
                "developerOnlyAttribute": false,
                "mutable": false,
                "required": true,
                "stringAttributeConstraints": {
                    "maxLength": "2048",
                    "minLength": "0"
                }
            }],
        });


        const client = new CognitoUserPoolClient(this, 'cognito-client', {
            name: props.userPoolName + '-client',
            allowedOauthFlowsUserPoolClient: true,
            allowedOauthFlows: ["code"],
            allowedOauthScopes: ["openid"],
            callbackUrls: props.callbackUrls,
            generateSecret: true,
            userPoolId: userPool.id,
            supportedIdentityProviders: ["COGNITO"]
        });

        new TerraformOutput(this, 'UserPoolARN', { value: userPool.arn })
        new TerraformOutput(this, 'UserPoolClientSecret', { 
            sensitive : true,
            value: client.clientSecret })
        new TerraformOutput(this, 'UserPoolClientId', { value: client.id })

        this.userPoolArn = userPool.arn
        this.userPoolClientSecret = client.clientSecret
        this.userPoolClientId = client.id
        this.userPoolClientOauthScopes = client.allowedOauthScopes
    }
}