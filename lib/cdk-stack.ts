import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineType: codepipeline.PipelineType.V2,
      pipelineName: 'TestPipeline',
      crossAccountKeys: false,
      enableKeyRotation: false,
    });

    // GitHub接続情報取得
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'GitHub_Source',
      owner: 'kaito01234',
      repo: 'github-branching-strategy',
      branch: 'production',
      output: sourceOutput,
      triggerOnPush: true,
      connectionArn: `arn:aws:codestar-connections:ap-northeast-1:948669373988:connection/868491e5-ad8b-4ec1-bdb3-43b676d9021b`,
    });

    const build = new codebuild.PipelineProject(this, 'CodeBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo $CODEBUILD_RESOLVED_SOURCE_VERSION',
              'cat fixfiles/newfile1.md',
            ],
          },
        },
      }),
    });

    const buildActions: codepipeline_actions.CodeBuildAction[] = [];
    for (let i = 0; i < 3; i++) {
      const buildAction = new codepipeline_actions.CodeBuildAction({
        actionName: `Build-${i}`,
        project: build,
        input: sourceOutput,
      })
      buildActions.push(buildAction);
    }


    // pipeline.addTrigger({
    //   providerType: codepipeline.ProviderType.CODE_STAR_SOURCE_CONNECTION,
    //   gitConfiguration: {
    //     sourceAction,
    //     pushFilter: [{
    //       tagsIncludes: ['v.*-development'],
    //     }],
    //   },
    // })

    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: buildActions,
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: buildActions,
    });

  }
}
