inherit RoomPlusCode;



void extra_create()
{
   set("short","A Small School Room");
   set("day_long",
   "This is a small room in the EotL Elementary School.  It, like the " +
   "other rooms in the building, has a succession of small desks facing " +
   "a black chalkboard.  Once again, your teacher , Miss Dixie, is " +
   "standing in the front of the room pointing to a chalkboard.  Look " +
   "at it to find out the next lesson.  When you are done, leave to the " +
   "north."
   );
   set("day_light",10);
   set("night_light",1);
   add("exits", (["south": "room04"]));
   add("exits", (["north": "room06.c"]));

   add("descs",([({"board","chalkboard","blackboard"}) : "In this lesson, you " +
   "will learn how to use channels.  Channels are ways of communication " +
   "for many people with a common interests.  The channels available to you at " +
   "this time (subject to change) are as follows:  newbie, gossip, radio, auction, " +
   "bitch, and a cant channel if you belong to a guild.  To toggle the " +
   "channels on/off, type 'channel <name>', and to talk on them, type " +
   "'channel <message>', or 'channel <emote>'.  These can be aliased to " +
   "the name of the channel without channel at the beginning; for ex: " +
   "'alias newbie channel newbie' makes the channel at the beginning " +
   "unnecessary.  When you become a member of a guild, you can speak " +
   "to other guild members by typing 'cant' to toggle on/off, and 'cant " +
  "<message>' to speak.  When you are familiar with this lesson, you " +
   "can continue on with the next lesson in the room to the north."]) );
}


