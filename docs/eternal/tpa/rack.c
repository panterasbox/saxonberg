#include "/zone/null/toys/tpa/tpa.h"
inherit ObjectCode;

void
extra_create()
{
  set("id", ({ "rack", "schedule rack", "TPA schedule rack", "TPA rack" }));
  set("short", "a TPA schedule rack");
  set("long", "A wire rack stands here next to the vending machine, full "
              "of dozens of small pamphlets which describe all the stations "
              "in the EotL Teleport Authority network.  A plastic sign "
              "perched atop the rack reads, \"Take One\".");
  set("gettable", 0);
  set("dropable", 0);
  return;
}

void
extra_init()
{
  add_action("do_take", "take");
  return;
}

int
do_take(string arg)
{
  if( !stringp(arg) || !strlen(arg) )
  {
    notify_fail("Take what?\n");
    return 0;
  }
  arg = lower_case(arg);
  if( member(({ "schedule", "tpa schedule", "one", "pamphlet" }), arg) == -1 )
  {
    write("There's nothing like that here to take.\n");
    return 1;
  }
  if( objectp( present_clone( TPASchedule, THISP ) ) )
  {
    write("You've already got a TPA schedule.\n");
    return 1;
  }
  move_object( clone_object(TPASchedule), THISP );
  tell_player( THISP, "You take a TPA schedule from the rack." );
  tell_room( ENV(THISO), PNAME + " takes a TPA schedule from the rack.\n",
             ({ THISP }) );
  return 1;  
}
