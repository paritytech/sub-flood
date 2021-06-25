# Add the repo
https://docs.gitlab.com/runner/install/kubernetes.html#installing-gitlab-runner-using-the-helm-chart
helm repo list
helm repo add gitlab https://charts.gitlab.io
helm repo update

# Customizing the Chart Before Installing
helm show values gitlab/gitlab-runner > values.yaml
# edit the file

# check current runer installation
helm ls -n gitlab-sub-flood-ci


# create secret for  chache runner
# docs example: https://docs.gitlab.com/runner/configuration/advanced-configuration.html#the-runnerscachegcs-section
# get credentials from here https://console.developers.google.com/apis/credentials?project=parity-simnet


# runnerRegistrationToken=''
helm install sub-flood-build-gitlab-runner  \
     gitlab/gitlab-runner \
     -f build-values.yaml \
     --namespace gitlab-sub-flood-ci \
     --set runnerRegistrationToken="${runnerRegistrationToken}"

helm install sub-flood-gitlab-runner  \
     gitlab/gitlab-runner \
     -f values.yaml \
     --namespace gitlab-sub-flood-ci \
     --set runnerRegistrationToken="${runnerRegistrationToken}"


# pull repo locally for inspection
helm pull gitlab/gitlab-runner --untar

# Push changes 
helm upgrade sub-flood-gitlab-runner gitlab/gitlab-runner  \
     -f values.yaml \
     --namespace gitlab-sub-flood-ci \
     --set runnerRegistrationToken="${runnerRegistrationToken}"



helm upgrade sub-flood-build-gitlab-runner gitlab/gitlab-runner  \
     -f build-values.yaml \
     --namespace gitlab-sub-flood-ci \
     --set runnerRegistrationToken="${runnerRegistrationToken}"


