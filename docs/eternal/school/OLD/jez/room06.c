inherit RoomPlusCode;

object machine;

void extra_create()
{
if(!machine)
CloneIt("/zone/null/eternal/school/machine", machine);
   set("short","A Small Locker room");
   set("day_long",
   "This is the EotL Elementary School locker room.  There are benches and lockers " +
   "lined up next to each other.  There are bats and balls thrown in boxes, as well as clothing items in the lockers.  " +
   "There is a sign above the lockers, that might explain what to do next."
   );
   set("day_light",10);
   set("night_light",1);
   add("exits", (["south": "room05"]));
   add("exits", (["north": "room07.c"]));
   add("descs",(["sign": "This sign explains the next lesson for school.  " +
   "Before going out for combat, one must get the right kind of armor " +
   "and weapons.  In most cases, you would go to a locker and 'list', " +
   "and 'retrieve' items that you have already acquired.  However, since " +
   "you don't have a locker yet, you can use special Newbie Armor, which was " +
   "specially made for this class.  The weapon you will use is the dagger that was " +
   "purchased from the vending machine.  Look at the machine in front " +
   "of you to find out how to buy the Newbie Armor.  Sharves are only " +
   "for characters of the Parthan race, and Teddy Bears and Squids cant wear armor." +
   "  Once you get your armor, 'wear' each individual thing, and 'wield' " +
   "the dagger.  To disarm, type 'unequip' and 'unwield'.  Stay armed " +
   "for the next lesson."]) );
}


