import { db } from "../../config/firebase-admin";
import {
  EVENTS_TRAINING_APP_ID,
  EVENTS_TRAINING_COLLECTIONS,
} from "../../constants/events-training";

export function eventsTrainingRoot() {
  return db.collection("apps").doc(EVENTS_TRAINING_APP_ID);
}

export function webinarsCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.webinarEvents,
  );
}

export function videosCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.trainingVideos,
  );
}

export function blogsCollection() {
  return eventsTrainingRoot().collection(EVENTS_TRAINING_COLLECTIONS.wrsBlogs);
}

export function registrationsCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.webinarRegistrations,
  );
}

export function schedulesCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.eventsTrainingSchedules,
  );
}

export function purchasesCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.videoPurchases,
  );
}

export function certificationsCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.trainingCertifications,
  );
}

export function videoCommentsCollection(videoId: string) {
  return videosCollection().doc(videoId).collection("comments");
}

export function blogCommentsCollection(blogId: string) {
  return blogsCollection().doc(blogId).collection("comments");
}

export function videoQuestionsCollection(videoId: string) {
  return videosCollection().doc(videoId).collection("questions");
}

/** SmartRefill member engagement root (`likes` / `posts` / `notes` / `views`). */
export function videoEngagementCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.trainingVideoEngagement,
  );
}

export function videoEngagementPostsCollection(videoId: string) {
  return videoEngagementCollection().doc(videoId).collection("posts");
}
