const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class mantains the list of individual story instances
 * It also has some methods for fetching, adding and removimg stories
 */

class StoryList {
     constructor(stories) {
         this.stories = stories;
     }

     /**
      * This method is designed to be called to generate a new storyList.
      * It:
      * - calls the API
      * - builds an array of story instances
      * - makes a single StoryList instance out of that
      * - returns the StoryList instance. 
      */

      // TODO: Note the presence of `static` keyword:this indicates that getStories
      // is not an instance method. Rather, it is a method that is called on the class directly.
      // Why doesn't it make sense for getStories to be an instance method?

static async getStories() {
          // query the / stories endpoint (no auth required)
          const response = await axios.get(`${BASE_URL}/stories`);

          // turn the plain old story objects from the API into instances of the story class
          const stories = response.data.stories.map(story => new Story(story));

          // build an instance of our own class using the new array of stories
          const storyList = new StoryList(stories);
          return storyList;
      }

      /**
       * Method to make a POST request to/stories and add the new story to the list
       * - user - the current instance of user who will post the story
       * - newStory - a new story object for the API with title, author and url
       * 
       * Returns the new story object
       */
async addStory(user, newStory) {
        const response = await axios ({
            method: "POST",
            url:    `${BASE_URL}/stories`,
            data: {
                // request body
                // this is the format specified by the API
                token:  user.loginToken,
                story:  newStory,
            }
        });

        // make a Story instance out of the story object we get back
        newStory = new Story(response.data.story);
        // add the story to the beginning of the list
        this.stories.unshift(newStory);
        // add the story to the beginning of the user's list
        user.ownStories.unshift(newStory);

        return newStory;
    }

    /**
     * Method to make a DELETE request to remove a particular story
     * and also update the StoryList
     * 
     * - user: the current user instance
     * - storyId: the ID of the story you want to remove
     */

async removeStory(user, storyId) {
     await axios({
         url: `${BASE_URL}/stories/${storyId}`,
         method: "DELETE",
         data:  {
            token: user.loginToken
         },
     });

     // filter out the story whose ID we are removing
     this.stories = this.stories.filter(story => story.storyId !== storyId);

     // do the same thing for the user's list of stories
     user.ownStories = user.ownStories.filter(s => s.storyId !== storyId);
    }
}

 /** The User class to primarily represent the current user.
  * There are helper methods to signup(create), login, and getLoggedInUser
  */

class User {
    constructor(userObj) {
        this.username = userObj.username;
        this.name = userObj.name;
        this.createdAt = userObj.createdAt;
        this.updatedAt = userObj.updatedAt;

        // these are all set to defaults, not passed in by the constructor
        this.loginToken = "";
        this.favorites  = [];
        this.ownStories = [];
    }

    /* Create and return a new user.
     * 
     * Make POST request to API and returns newly-created user.
     * 
     * - username: a new username
     * - password: a new password
     * - name: the user's full name
     */

static async create(username, password, name) {
        const response = await axios.post(`${BASE_URL}/signup`, {
            user: {
                 username,
                 password,
                 name,
            }
         });
         
         // build a new User instance from the API response
         const newUser = new User(response.data.user);

         // attach the token to the newUser instance for convenience
         newUser.loginToken = response.data.token;

         return newUser;
     }

     /* Login in user and return user instance.

      * - username: an existing user's username
      * - password: an existing user's password
      */

static async login(username, password) {
          const response = await axios.post(`${BASE_URL}/login`, {
              user: {
                  username,
                  password,
              }
          });

          // build a new user instance from the API response
          const existingUser = new User(response.data.user);

          // Instanciate story instances for the user's favorites and ownStories
          existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
          existingUser.ownStories = response.data.user.ownStories.map(s => new Story(s));

          // Attach the token to the newUser instance for convenience
          existingUser.loginToken = response.data.token;
          
          return existingUser;
    }

      /** Get user instance for the logged-in-user.
       * 
       * This function uses the token & username to make an API resquest to get details about the user. Then it creates an instance of user with that info.
       */
static async getLoggedInUser(token, username) {
          // if we don't have user info, return null
          if (!token || !username) return null;

          // call the API
          const response = await axios.get(`${BASE_URL}/users/${username}`,{
              params: {token}
          });

          // instantiate the user from the API information
          const existingUser = new User(response.data.user);

          // attach the token to the newUser instance for convenience
          existingUser.loginToken = token;

          // instantiate Story instances for the user's favorite and ownStories
          existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
          existingUser.ownStories = response.data.user.ownStories.map(s => new Story(s));
          
          return existingUser;
        }

        /**
         * This function fetches user information from the API
         * AT /users/{username} using a token. Then it sets all the 
         * appropriate instance properties from the response with the current user instance.
         */

async retriveDetails() {
            const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
                params: {
                    token: this.loginToken
                }
            });

            // update all of the user's properties from the API response
            this.name = response.data.user.name;
            this.createdAt = response.data.user.createdAt;
            this.updatedAt = response.data.user.updatedAt;

            // remember to convert the user's favorites and ownStories into instances of Story
            this.favorites = response.data.user.favorites.map(s => new Story(s));
            this.ownStories = response.data.user.stories.map(s => new Story(s));

            return this;
        }

        /**
         * Add a story to the list of user favorites and update the API
         * - storyId: an ID of a story to add to favorites
         */

         addFavorite(storyId) {
             return this._toggleFavorite(storyId, "POST");
         }
        /**
         * Remove a story to the list of user favorites and update the API 
         * - storyId: an ID of a story to remove from favorites
         */

         removeFavorite(storyId) {
             return this._toggleFavorite(storyId, "DELETE");
         }

        /**
         * A helper method to either POST or DELETE to the API
         * - storyId: an ID of a story to remove from favorites
         * - httpVerb: POST or DELETE based on adding or removing
         */

async _toggleFavorite(storyId, httpVerb) {
         await axios({
             url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
             method: httpVerb,
             data: {
                 token: this.loginToken
                 }
             });

             await this.retriveDetails();
             return this;
    }

         /**
          * Send a PATCH request to the API in order to update the user
          * - userData: the user properties you want to update
          */

async update(userData) {
        const response = await axios({
                url: `${BASE_URL}/users/${this.username}`,
                method: "PATCH",
                data: {
                    user: userData,
                    token: this.loginToken
                  }
              });

              // "name" is really the only property you can update
              this.name = response.data.user.name;

              // Note: you can also update "password" but we're not storing it
              return this;
        }
        
        /**
         * Send a DELETE request to the API in order to remove the user
         */

async remove() {
             // this function is really just a wrapper around axios
            await axios({
                url:  `${BASE_URL}/users/${this.username}`,
                method: "DELETE",
                data: {
                    token: this.loginToken
                }
            });
        }
    }    
    /**
     * Class to represent a single Story
     */

class Story {
         /**
          * The constructor is designed to take an object for better readability / flexibility
          * - storyObj - an object that has properties in it.
          */

constructor(storyObj) {
              this.author = storyObj.author;
              this.title =  storyObj.title;
              this.storyId =  storyObj.storyId;
              this.url   =  storyObj.url;
              this.username = storyObj.username;
              this.createdAt = storyObj.createdAt;
              this.updatedAt = storyObj.updatedAt;
        }

        /**
         * Make a PATCH request against/ stories/{storyId} to update a single story
         * - user: an instance of User
         * - storyData: an object containing the properties you want to update
         */

async update(user, storyData) {
             const response = await axios({
                 url: `${BASE_URL}/stories/${this.storyId}`,
                 method: "PATCH",
                 data: {
                     token: user.loginToken,
                     story: storyData
                 }
             });

             const { author, title, url, updatedAt } = response.data.story;

             // these are the only fields that you can change with a PATCH update
             // so we don't need to worry about updating the others
             this.author = author;
             this.title = title;
             this.url = url;
             this.updatedAt = updatedAt;

             return this;
        }
    }           