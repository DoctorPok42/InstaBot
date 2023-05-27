import { IgApiClient } from 'instagram-private-api';
import * as fs from 'fs-extra';
import cron from 'node-cron';

const username = 'YOUR_USERNAME';
const password = 'YOUR_PASSWORD';

async function checkNewPost() {
    // initialisation de l'api
    const ig = new IgApiClient();
    ig.state.generateDevice(username);
    await ig.simulate.preLoginFlow();

    // connexion
    const loggedInUser = await ig.account.login(username, password);

    console.log("logged in as " + loggedInUser.username);

    // récupération des posts des personnes suivies
    const following = await ig.feed.accountFollowing().request();
    const followingIds = following.users.map((user: any) => user.pk);

    const posts: any[] = [];
    const newPosts: any[] = [];

    for (const userId of followingIds) {
        const userFeed = ig.feed.user(userId);
        const response = await userFeed.items();
        posts.push(response[0]);

        const file = await fs.readFile('./config/followed.json', 'utf8');
        const followed = JSON.parse(file);

        if (!response[0])
            continue;

        const alreadyFollowed = followed.find((item: any) => item.id === response[0].id);
        if (alreadyFollowed) {
            continue;
        } else {
            // si non, liker le post (optionnel)
            await ig.media.like({
                mediaId: response[0].id,
                moduleInfo: {
                    module_name: 'profile',
                    user_id: loggedInUser.pk,
                    username: loggedInUser.username,
                },
                d: 1,
            });
            // et ajouter le post dans les fichiers json
            followed.push({
                username: response[0].user.username,
                id: response[0].id,
            });
            newPosts.push({
                ...newPosts,
                username: response[0].user.username,
                id: response[0].id,
                urlPost: "https://www.instagram.com/p/" + response[0].code + "/",
            });
            await fs.writeFile('./config/followed.json', JSON.stringify(followed));
            await fs.writeFile('./config/newPosts.json', JSON.stringify(newPosts));
        }
    }
}

cron.schedule('0 20 * * *', () => {
    checkNewPost();
});
