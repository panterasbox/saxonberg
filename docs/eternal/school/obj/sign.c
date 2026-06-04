inherit ObjectCode;

void extra_create()
{
    set("id",({"sign","balloon schedule","schedule"}) );
    set("short","a bright yellow sign"); 
    set("gettable",0);
}

status schedule()
{
    int time;
    time=ClockObject->query("hour");
    printf("The sign reads:\n");
    printf("\nCurrent time:       %s\n",
      ClockObject->query("time_12"));
    printf("Next Balloon to EC: %s\n",
      ((time > 9 && time < 13) || time > 21 ?
	"" : "0" )+(time > 12 ? 
	time-11 : time+1 ) +
      ":00 "+( time+1 < 12 || time+1 == 24 ?
	"am":"pm"));
    return 1;
}        

string long(string str)
{
    schedule();
}
