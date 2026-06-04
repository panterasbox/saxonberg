inherit RoomCode;
inherit DescCode;

void extra_create(){

set_short("Warrior Barracks");
set_long("This is a room where warriors can come to store their weapons after\n"+
"a hard day of fighting.  The room is warm and relaxing as comrades exchange\n"+
"war stories while changing. There is an archway to the west that leads back\n"+
"to the main guild hall.\n");

  add_exit("west", "warrior2");
  add_property(THISO, NoCombatP);
  move_object(clone_object(SaveRoomCode), THISO);

}
void extra_reset()
{
  if(!present("machine"))
{
	move_object(clone_object("/usr/locus/open/mac.c"),THISO);
}
}
extra_init()
{
 if((string)GUILDMASTER->query_member(PRNAME) != "warrior")
{
 if(!IsWizard(THISP)) {
 write("Only warriors are allowed to be here!\n");
 move_object(THISP,"/zone/null/eternal/common");
 }
}
}
